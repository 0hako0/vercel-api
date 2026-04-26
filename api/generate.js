export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, charImageBase64 } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  try {
    let predictionBody;

    if (charImageBase64) {
      predictionBody = {
        version: "black-forest-labs/flux-dev",
        input: {
          prompt,
          image: charImageBase64,
          image_strength: 0.75,
          num_outputs: 1,
          aspect_ratio: '1:1',
          output_format: 'webp',
          num_inference_steps: 28
        }
      };
    } else {
      predictionBody = {
        input: {
          prompt,
          num_outputs: 1,
          aspect_ratio: '1:1',
          output_format: 'webp',
          num_inference_steps: 4
        }
      };
    }

    const endpoint = charImageBase64
      ? 'https://api.replicate.com/v1/predictions'
      : 'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait'
      },
      body: JSON.stringify(predictionBody)
    });

    const data = await response.json();

    let result = data;
    if (result.status && result.status !== 'succeeded' && result.urls?.get) {
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const poll = await fetch(result.urls.get, {
          headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}` }
        });
        result = await poll.json();
        if (result.status === 'succeeded' || result.status === 'failed') break;
      }
    }

    const imageUrl = result.output?.[0];
    if (!imageUrl) return res.status(500).json({ error: 'No image generated', detail: result });

    res.status(200).json({ imageUrl, status: 'succeeded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
