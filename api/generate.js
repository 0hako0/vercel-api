export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const response = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait'
      },
      body: JSON.stringify({
        input: { prompt, num_outputs: 1, aspect_ratio: '1:1' }
      })
    });

    const data = await response.json();
    const imageUrl = data.output?.[0];

    if (!imageUrl) {
      return res.status(500).json({ error: 'No image generated', detail: data });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({ imageUrl, status: 'succeeded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
