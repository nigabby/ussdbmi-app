const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
const PORT = 5000;

app.use(bodyParser.urlencoded({ extended: false }));

// PostgreSQL connection (update with your real connection string)
const pool = new Pool({
  connectionString: 'postgresql://gabby_owner:npg_pzvP1lYm0xkb@ep-restless-wave-a89hhc0b-pooler.eastus2.azure.neon.tech/gabby?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

app.post('/ussd', async (req, res) => {
  // Grab sessionId and phone (sanitize phone)
  const sessionId = req.body.sessionId || req.body.session_id || '';
  const phoneRaw = req.body.phone || req.body.msisdn || req.body.phoneNumber || '';
  const phone = phoneRaw.replace(/\D/g, '').slice(-10);
  let input = (req.body.text || '').split('*');

  // Handle back navigation "0"
  if (input.includes('0')) {
    const lastZeroIndex = input.lastIndexOf('0');
    if (lastZeroIndex > 0) {
      input.splice(lastZeroIndex - 1, 2); // remove previous entry and the '0'
    } else {
      input.splice(lastZeroIndex, 1); // just remove the '0' if at start
    }
  }

  let response = '';

  try {
    console.log('Session:', sessionId, 'Phone:', phone, 'Text:', req.body.text);

    if (!phone) {
      return res.send('END Phone number missing.');
    }

    // Level 1: Language selection
    if (input.length === 1 && input[0] === '') {
      response = `CON Welcome to BMI Checker App. Please choose your language:
Murakaza neza kuri BMI Checker App. Hitamo ururimi:
1. English
2. Kinyarwanda`;
    }

    // English Flow
    else if (input[0] === '1') {
      if (input.length === 1) {
        response = `CON Please enter your age:\n0. Back`;
      } else if (input.length === 2) {
        response = `CON Please enter your weight in KGs (e.g., 68):\n0. Back`;
      } else if (input.length === 3) {
        response = `CON Enter your height in centimeters (e.g., 170):\n0. Back`;
      } else if (input.length === 4) {
        const age = parseInt(input[1]);
        const weight = parseFloat(input[2]);
        const heightCm = parseFloat(input[3]);
        const height = heightCm / 100;

        if (isNaN(age) || isNaN(weight) || isNaN(height) || height === 0) {
          response = `END Invalid input. Please restart.`;
        } else {
          const bmi = weight / (height * height);
          const status = bmi < 18.5 ? "Underweight"
                        : bmi < 25   ? "Normal"
                        : bmi < 30   ? "Overweight"
                        : "Obese";

          await saveUserAndBmi(sessionId, phone, age, weight, heightCm, bmi, status, null);

          response = `CON Your BMI is ${bmi.toFixed(1)}. You are ${status}.
Do you want health tips?
1. Yes
2. No
0. Back`;
        }
      } else if (input.length === 5) {
        const tipChoice = input[4];
        const lastRecord = await getLastBmi(phone);
        const bmi = parseFloat(lastRecord?.bmi_value || 0);
        const status = lastRecord?.bmi_category || '';
        let tips = '';

        if (tipChoice === '1') {
          if (bmi < 18.5) tips = 'Eat more protein and calories. See a nutritionist.';
          else if (bmi < 25) tips = 'Great! Maintain your weight with healthy meals and exercise.';
          else if (bmi < 30) tips = 'Reduce sugar and fat, eat fruits and vegetables.';
          else tips = 'Please visit a health center for full checkup and advice.';

          // Update bmi_records with tips_given
          await updateTipsGiven(lastRecord.id, tips);

          response = `END ${tips}`;
        } else if (tipChoice === '2') {
          // User chose No tips, update bmi_records with 'No tips given'
          await updateTipsGiven(lastRecord.id, 'No tips given');

          response = `END Thank you for using BMI Checker App.`;
        } else {
          response = `END Invalid input.`;
        }
      } else {
        response = `END Invalid input.`;
      }
    }

    // Kinyarwanda Flow
    else if (input[0] === '2') {
      if (input.length === 1) {
        response = `CON Shyiramo imyaka yawe:\n0. Gusubira inyuma`;
      } else if (input.length === 2) {
        response = `CON Andika ibiro byawe mu makirogaramu (Urugero: 68):\n0. Gusubira inyuma`;
      } else if (input.length === 3) {
        response = `CON Andika uburebure bwawe muri cm (Urugero: 170):\n0. Gusubira inyuma`;
      } else if (input.length === 4) {
        const age = parseInt(input[1]);
        const weight = parseFloat(input[2]);
        const heightCm = parseFloat(input[3]);
        const height = heightCm / 100;

        if (isNaN(age) || isNaN(weight) || isNaN(height) || height === 0) {
          response = `END Ibyinjijwe si byo. Ongera ugerageze.`;
        } else {
          const bmi = weight / (height * height);
          const status = bmi < 18.5 ? "Ufite umubyibuho muke"
                        : bmi < 25   ? "Umubyibuho usanzwe"
                        : bmi < 30   ? "Ufite ibiro byinshi"
                        : "Ufite umubyibuho ukabije";

          await saveUserAndBmi(sessionId, phone, age, weight, heightCm, bmi, status, null);

          response = `CON BMI yawe ni ${bmi.toFixed(1)}. ${status}.
Wifuza inama z’ubuzima?
1. Yego
2. Oya
0. Gusubira inyuma`;
        }
      } else if (input.length === 5) {
        const tipChoice = input[4];
        const lastRecord = await getLastBmi(phone);
        const bmi = parseFloat(lastRecord?.bmi_value || 0);
        const status = lastRecord?.bmi_category || '';
        let tips = '';

        if (tipChoice === '1') {
          if (bmi < 18.5) tips = 'Rya indyo yuzuye, irimo poroteyine nyinshi. Jya kwa muganga.';
          else if (bmi < 25) tips = 'Ni byiza! Komeza kurya indyo nziza no gukora siporo.';
          else if (bmi < 30) tips = 'Gabanya isukari n’amavuta, ria imbuto n’imboga.';
          else tips = 'Jya kwa muganga kugira ngo ubone inama n’ubufasha bukwiye.';

          await updateTipsGiven(lastRecord.id, tips);

          response = `END ${tips}`;
        } else if (tipChoice === '2') {
          await updateTipsGiven(lastRecord.id, 'No tips given');

          response = `END Murakoze gukoresha BMI Checker App.`;
        } else {
          response = `END Ibyinjijwe si byo.`;
        }
      } else {
        response = `END Ibyinjijwe si byo.`;
      }
    }

    else {
      response = `END Invalid input. Please restart.`;
    }

    res.set('Content-Type', 'text/plain');
    res.send(response);

  } catch (err) {
    console.error('Error:', err);
    res.send('END System error. Please try again later.');
  }
});

// Save user and BMI data, include session_id, no tips yet
async function saveUserAndBmi(sessionId, phone, age, weight, height_cm, bmi, category, tips_given = null) {
  if (!phone) throw new Error("Missing phone number");

  // Upsert user with session_id (update session_id on every request)
  await pool.query(
    `INSERT INTO users (phone, age, weight_kg, height_cm, session_id)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (phone) DO UPDATE SET
       age = EXCLUDED.age,
       weight_kg = EXCLUDED.weight_kg,
       height_cm = EXCLUDED.height_cm,
       session_id = EXCLUDED.session_id`,
    [phone, age, weight, height_cm, sessionId]
  );

  // Get user id
  const userRes = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
  const userId = userRes.rows[0]?.id;
  if (!userId) throw new Error("User ID not found");

  // Insert bmi record with optional tips_given
  await pool.query(
    `INSERT INTO bmi_records (user_id, bmi_value, bmi_category, tips_given, created_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
    [userId, bmi, category, tips_given]
  );
}

// Update tips_given on the last bmi record after user chooses Yes/No
async function updateTipsGiven(bmiRecordId, tips) {
  if (!bmiRecordId) throw new Error("Missing BMI record ID");

  await pool.query(
    `UPDATE bmi_records SET tips_given = $1 WHERE id = $2`,
    [tips, bmiRecordId]
  );
}

// Get last BMI record for a phone
async function getLastBmi(phone) {
  const res = await pool.query(`
    SELECT b.id, b.bmi_value, b.bmi_category, b.tips_given
    FROM bmi_records b
    JOIN users u ON u.id = b.user_id
    WHERE u.phone = $1
    ORDER BY b.created_at DESC LIMIT 1
  `, [phone]);

  return res.rows[0];
}

app.listen(PORT, () => {
  console.log(`USSD BMI App running on port ${PORT}`);
});
