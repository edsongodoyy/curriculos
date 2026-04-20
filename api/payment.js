module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
  const SITE_URL = process.env.SITE_URL;

  if (!MP_TOKEN) return res.status(500).json({ error: 'MP_ACCESS_TOKEN não configurado' });
  if (!SITE_URL) return res.status(500).json({ error: 'SITE_URL não configurado' });

  try {
    const preference = {
      items: [{
        title: 'CurrículoATS — Otimização com IA',
        quantity: 1,
        currency_id: 'BRL',
        unit_price: 19.90
      }],
      back_urls: {
        success: SITE_URL + '/?status=approved',
        failure: SITE_URL + '/?status=failure',
        pending: SITE_URL + '/?status=pending'
      },
      auto_return: 'approved',
      binary_mode: true
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + MP_TOKEN
      },
      body: JSON.stringify(preference)
    });

    const data = await response.json();

    if (!data.init_point) {
      return res.status(500).json({ error: 'Erro ao criar pagamento', detail: data });
    }

    return res.status(200).json({ init_point: data.init_point, preference_id: data.id });

  } catch (err) {
    return res.status(500).json({ error: 'Erro interno', detail: err.message });
  }
};
