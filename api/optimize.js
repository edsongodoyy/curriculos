const SYSTEM_PROMPT = `Você é um especialista em otimização de currículos para ATS. Responda APENAS com JSON válido, sem markdown. Estrutura exata:
{"scoreBefore":0,"scoreAfter":0,"keywordsFound":[],"keywordsMissing":[],"optimizedResume":"","professionalSummary":"","improvements":"","linkedinHeadline":"","linkedinAbout":"","linkedinSkills":[]}`;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const MP_TOKEN      = process.env.MP_ACCESS_TOKEN;
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

  if (!MP_TOKEN)      return res.status(500).json({ error: 'MP_ACCESS_TOKEN não configurado' });
  if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY não configurado' });

  const { paymentId, pdfText, jobText } = req.body || {};

  if (!paymentId) return res.status(400).json({ error: 'paymentId obrigatório' });
  if (!pdfText)   return res.status(400).json({ error: 'pdfText obrigatório' });
  if (!jobText)   return res.status(400).json({ error: 'jobText obrigatório' });

  try {
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': 'Bearer ' + MP_TOKEN }
    });
    const payment = await mpRes.json();

    if (payment.status !== 'approved') {
      return res.status(402).json({ error: 'Pagamento não aprovado', status: payment.status });
    }

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: 'CURRÍCULO:\n' + pdfText + '\n\nVAGA:\n' + jobText
        }]
      })
    });

    const claudeData = await claudeRes.json();
    const raw = claudeData.content[0].text;
    const result = JSON.parse(raw.replace(/```json|```/g, '').trim());

    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: 'Erro interno', detail: err.message });
  }
};
