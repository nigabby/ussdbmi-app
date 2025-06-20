const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;

app.use(bodyParser.urlencoded({ extended: false }));

app.post('/ussd', (req, res) => {
    const { sessionId, serviceCode, phoneNumber, text } = req.body;

    let response = '';

    // Handle back command '0'
    let textArray = text.split('*');
    let lastText = textArray[textArray.length - 1];

    if (lastText === '0') {
        // Remove last '0' and the previous input to go back one step
        textArray.pop(); 
        textArray.pop();
        lastText = textArray[textArray.length - 1] || '';
    }

    const updatedText = textArray.join('*');

    // Helper function to parse numbers safely
    const parseNumber = (str) => {
        const num = parseFloat(str);
        return isNaN(num) ? null : num;
    };

    // Start of USSD app flow
    if (updatedText === '') {
        // Language selection menu
        response = `CON Welcome to BMI Calculator App
Please choose your language:
1. English
2. Kinyarwanda`;
    }
    else if (updatedText === '1') {
        // English: ask for weight
        response = 'CON Please enter your weight in KG:';
    }
    else if (updatedText === '2') {
        // Kinyarwanda: ask for weight
        response = 'CON Andika ibiro byawe muri KG:';
    }

    // ENGLISH FLOW
    else if (updatedText.startsWith('1*')) {
        const inputs = updatedText.split('*');
        // inputs[0] = '1' (language)
        // inputs[1] = weight (KG)
        // inputs[2] = height (CM)
        // inputs[3] = wants tips? (1 for Yes, 2 for No)

        // Step 1: User entered weight, ask for height
        if (inputs.length === 2) {
            const weight = parseNumber(inputs[1]);
            if (weight === null || weight <= 0) {
                response = 'END Invalid weight. Please try again later.';
            } else {
                response = 'CON Please enter your height in CM:';
            }
        }
        // Step 2: User entered height, calculate BMI and show category, then ask about tips
        else if (inputs.length === 3) {
            const weight = parseNumber(inputs[1]);
            const heightCm = parseNumber(inputs[2]);

            if (heightCm === null || heightCm <= 0) {
                response = 'END Invalid height. Please try again later.';
            } else {
                const heightM = heightCm / 100;
                const bmi = weight / (heightM * heightM);
                let category = '';
                let bmiRounded = bmi.toFixed(1);

                if (bmi < 18.5) category = 'Underweight';
                else if (bmi >= 18.5 && bmi < 25) category = 'Normal weight';
                else if (bmi >= 25 && bmi < 30) category = 'Overweight';
                else category = 'Obese';

                response = `CON Your BMI is ${bmiRounded}, category: ${category}.
Do you want health tips?
1. Yes
2. No
0. Back`;
            }
        }
        // Step 3: User chooses if they want health tips
        else if (inputs.length === 4) {
            const weight = parseNumber(inputs[1]);
            const heightCm = parseNumber(inputs[2]);
            const tipsChoice = inputs[3];

            const heightM = heightCm / 100;
            const bmi = weight / (heightM * heightM);
            let category = '';
            let tips = '';

            if (bmi < 18.5) {
                category = 'Underweight';
                tips = 'Eat nutrient-rich foods and increase calorie intake gradually.';
            } else if (bmi >= 18.5 && bmi < 25) {
                category = 'Normal weight';
                tips = 'Maintain your healthy lifestyle with balanced diet and exercise.';
            } else if (bmi >= 25 && bmi < 30) {
                category = 'Overweight';
                tips = 'Increase physical activity and reduce intake of sugary and fatty foods.';
            } else {
                category = 'Obese';
                tips = 'Consult a healthcare provider and adopt a healthier diet and exercise plan.';
            }

            if (tipsChoice === '1') {
                response = `END Health Tips for ${category}:
${tips}`;
            } else if (tipsChoice === '2') {
                response = 'END Thank you for using the BMI Calculator App. Stay healthy!';
            } else if (tipsChoice === '0') {
                // Go back to the previous step (BMI category and tips question)
                const bmiRounded = bmi.toFixed(1);
                response = `CON Your BMI is ${bmiRounded}, category: ${category}.
Do you want health tips?
1. Yes
2. No
0. Back`;
            } else {
                response = 'END Invalid choice. Please try again later.';
            }
        }
        else {
            response = 'END Invalid input.';
        }
    }

    // KINYARWANDA FLOW
    else if (updatedText.startsWith('2*')) {
        const inputs = updatedText.split('*');

        // inputs[0] = '2' (language)
        // inputs[1] = ibiro (weight KG)
        // inputs[2] = uburebure (height CM)
        // inputs[3] = health tips choice (1 Yes, 2 No)

        if (inputs.length === 2) {
            const weight = parseNumber(inputs[1]);
            if (weight === null || weight <= 0) {
                response = 'END Ibiro wanditse si byo. Ongera ugerageze.';
            } else {
                response = 'CON Andika uburebure bwawe muri CM:';
            }
        }
        else if (inputs.length === 3) {
            const weight = parseNumber(inputs[1]);
            const heightCm = parseNumber(inputs[2]);

            if (heightCm === null || heightCm <= 0) {
                response = 'END Uburebure wanditse si bwo. Ongera ugerageze.';
            } else {
                const heightM = heightCm / 100;
                const bmi = weight / (heightM * heightM);
                let category = '';
                let bmiRounded = bmi.toFixed(1);

                if (bmi < 18.5) category = 'Ufite ibiro bike';
                else if (bmi >= 18.5 && bmi < 25) category = 'Ibiro bisanzwe';
                else if (bmi >= 25 && bmi < 30) category = 'Ibiro byinshi';
                else category = 'Ufite ibiro byinshi cyane';

                response = `CON BMI yawe ni ${bmiRounded}, category: ${category}.
Wifuza inama z’ubuzima?
1. Yego
2. Oya
0. Gusubira inyuma`;
            }
        }
        else if (inputs.length === 4) {
            const weight = parseNumber(inputs[1]);
            const heightCm = parseNumber(inputs[2]);
            const tipsChoice = inputs[3];

            const heightM = heightCm / 100;
            const bmi = weight / (heightM * heightM);
            let category = '';
            let tips = '';

            if (bmi < 18.5) {
                category = 'Ufite ibiro bike';
                tips = 'Kurya ibiryo bifite intungamubiri nyinshi no kongera ingano y\'ibiribwa.';
            } else if (bmi >= 18.5 && bmi < 25) {
                category = 'Ibiro bisanzwe';
                tips = 'Komeza ubuzima bwiza ufate indyo yuzuye kandi ukore imyitozo ngororamubiri.';
            } else if (bmi >= 25 && bmi < 30) {
                category = 'Ibiro byinshi';
                tips = 'Kongera imyitozo no kugabanya ibiryo birimo isukari n\'amavuta menshi.';
            } else {
                category = 'Ufite ibiro byinshi cyane';
                tips = 'Gana kwa muganga kandi ufate gahunda yo kugabanya ibiro no gukora imyitozo.';
            }

            if (tipsChoice === '1') {
                response = `END Inama z'ubuzima ku bantu bafite ${category}:
${tips}`;
            } else if (tipsChoice === '2') {
                response = 'END Urakoze gukoresha BMI Calculator App. Ugire ubuzima bwiza!';
            } else if (tipsChoice === '0') {
                // Go back to previous question
                const bmiRounded = bmi.toFixed(1);
                response = `CON BMI yawe ni ${bmiRounded}, category: ${category}.
Wifuza inama z’ubuzima?
1. Yego
2. Oya
0. Gusubira inyuma`;
            } else {
                response = 'END Amahitamo si yo. Ongera ugerageze.';
            }
        }
        else {
            response = 'END Input si yo.';
        }
    }

    else {
        response = 'END Invalid input. Please try again.';
    }

    res.set('Content-Type', 'text/plain');
    res.send(response);
});

app.listen(PORT, () => {
    console.log(`✅ BMI USSD app running on port ${PORT}`);
});
