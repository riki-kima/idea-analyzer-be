const _ = require('lodash');
const pdf = require('pdf-creator-node');
const fs = require('fs');
const { doc } = require('../utils/authGoogle');
const path = require('path');
const {
  getScore,
  getAssociates,
  getOverallImage,
  getImages,
} = require('../utils/scores');

const getQuestions = async (req, res) => {
  await doc.loadInfo();
  const sheetQuestion = doc.sheetsByTitle['Backend: Questions'];
  const questionRows = await sheetQuestion.getRows();

  const groupedQuestions = [];
  const images = await getImages();
  let lastHash = '';

  // Questions
  for (let i = 0; i < questionRows.length; i++) {
    const item = questionRows[i];
    const hash = item.get('#');

    const rowObject = {
      Category: item.get('Category'),
      '#': hash,
      'Sub Score': item.get('Sub Score'),
      Points: item.get('Points'),
      Question: item.get('Question'),
      'Question Image': item.get('Question Image'),
      Description: item.get('Description'),
      Answer: item.get('Answer'),
      'Answer Image': item.get('Answer Image'),
      'Absolute Points': item.get('Absolute Points'),
      Pro: item.get('Pro'),
      Con: item.get('Con'),
      Input: item.get('Input'),
    };

    if (hash !== '') {
      groupedQuestions.push(rowObject);
      lastHash = hash;
    } else {
      groupedQuestions.push({ ...rowObject, '#': lastHash });
    }
  }

  const questions = _(groupedQuestions)
    .groupBy((x) => x['#'])
    .map((value) => {
      let parent = {};
      const list = [];
      const resVal = value.reduce((arr, curr) => {
        if (curr.Question) {
          parent = {
            component: curr.Input || 'Select',
            title: curr.Question,
            name: _.snakeCase(curr.Question),
            description: curr.Description,
            align:
              !curr['Answer Image'] && curr.Answer !== '[default]'
                ? 'vertical'
                : 'horizontal',
            category: curr.Category,
            image: images.find((x) => x.Filename === curr['Question Image'])?.[
              'Image URL'
            ],
          };
        }
        if (curr.Answer !== '[default]') {
          list.push({
            label: curr.Answer,
            value: curr['Absolute Points'],
            image: images.find((x) => x.Filename === curr['Answer Image'])?.[
              'Image URL'
            ],
            pro: curr.Pro || '',
            con: curr.Con || '',
          });
        }
        const questionInputText = _.snakeCase(
          'Rounded to the nearest American dollar, what would be a good base price for your product?'
        );
        if (_.snakeCase(curr.Question) === questionInputText) {
          parent = {
            ...parent,
            component: 'TextInput',
            type: 'number',
          };
        }
        return { ...parent, list };
      }, []);
      return resVal;
    })
    .value();

  return res.json({ success: true, questions });
};

const generatePDF = async (req, res) => {
  try {
    const { form } = req.body;

    const values = Object.values(form);

    const totalByCategories = {
      'Product Development Difficulty': 58,
      'Creator-Product Fit': 0,
      'Market Opportunity': 0,
    };

    for (let i = 0; i < values.length; i++) {
      const item = values[i];
      if (Array.isArray(item.value)) {
        item.value.map((x) => {
          totalByCategories[item.category] += Number(x.value);
        });
      } else if (item.score) {
        totalByCategories[item.category] += Number(item.score);
      } else {
        totalByCategories[item.category] += Number(item.value);
      }
    }

    const total = Object.values(totalByCategories).reduce(
      (acc, curr) => acc + curr,
      0
    );

    const overallKey = 'Overall Score';
    const productDevKey = 'Product Development Difficulty';
    const creatorProductKey = 'Creator-Product Fit';
    const marketKey = 'Market Opportunity';

    const overall = await getScore(overallKey, total);
    const productDev = await getScore(
      productDevKey,
      totalByCategories[productDevKey]
    );
    const creatorProduct = await getScore(
      creatorProductKey,
      totalByCategories[creatorProductKey]
    );
    const market = await getScore(marketKey, totalByCategories[marketKey]);

    const prosMarket = getAssociates({
      data: form,
      key: 'pro',
      category: marketKey,
    });

    const consMarket = getAssociates({
      data: form,
      key: 'con',
      category: marketKey,
    });
    const prosCreatorProduct = getAssociates({
      data: form,
      key: 'pro',
      category: creatorProductKey,
    });

    const consCreatorProduct = getAssociates({
      data: form,
      key: 'con',
      category: creatorProduct,
    });
    const prosProductDev = getAssociates({
      data: form,
      key: 'pro',
      category: productDevKey,
    });

    const consProductDev = getAssociates({
      data: form,
      key: 'con',
      category: productDevKey,
    });

    const overallImage = await getOverallImage(total);

    const starBlank = 'http://localhost:5500/star.png';
    const starFilled = 'http://localhost:5500/star-filled.png';

    const rawHtml = fs.readFileSync(
      path.join(__dirname, '../utils/pdf.html'),
      'utf-8'
    );

    const stars = (totalOfStar) =>
      [...Array(5).keys()]
        .map((x) => {
          if (Number(totalOfStar) > x)
            return `<img src="${starFilled}" style="width: 15px; height: 15px;"/>`;
          return `<img src="${starBlank}" style="width: 15px; height: 15px;"/>`;
        })
        .join('');

    const section = ({
      title,
      outcomes,
      intro,
      pros,
      conIntro,
      cons,
      outro,
      totalOfStar,
    }) => `
      <div style="margin-top: 12px;">
        <div class="justify">
          <div style="width: 80%; font-size: 16px; color: #18859F;">
            <span style="font-weight: 700;">${title}:</span>
            <span>${outcomes}</span>
          </div>
          <div style="width: 20%; text-align: right;">
          ${stars(totalOfStar)}
          </div>
        </div>

        <div class="text">${intro}</div>
        <div class="text">${pros}</div>
        <div class="text">${
          cons.replaceAll('\n', '').length ? conIntro : ''
        }</div>
        <div class="text">${cons}</div>
        <div class="text">${outro}</div>
      </div>
      `;

    const outro = () => {
      if (overall.Outro.includes('Ok, you have our attention...'))
        return ` <div>
       <div style="margin-top: 12px; font-size: 16px; color: #18859F;"> Ok, you have our attention...</div>
       <div class="text" style="font-size: 12px; color: #272C51;">
          Congratulations! You product idea scored in the top 10%. This earns you a free 30-minute consultation with makeXnow!
       </div>
       <div style="text-align: center; margin-top: 10px;">
          <a href="https://www.makexnow.com/meeting" style="color: #19599E; font-size: 14px; text-align: center; font-weight: 700;" target="_blank">CLICK HERE TO SCHEDULE A CALL WITH US</a>
       </div>
      </div>`;

      return `<div class="text">${overall.Outro}</div>`;
    };

    const customHtml = `
    <div>
      <div>
        <div class="justify">
          <div style="width: 80%; font-size: 16px; color: #18859F;">
            <span style="font-weight: 700;">Product Idea Score:</span>
            <span>${overall.Outcomes}</span>
          </div>
          <div style="width: 20%; text-align: right;">
          ${stars(overall.Stars)}
          </div>
        </div>
        
        <div class="text">
          ${overall.Intro}
        </div
        <div>
          <img src="${overallImage.replace(
            'https',
            'http'
          )}" style="width: 100%; height: 250px; margin-top: 25px;"/>
        </div>
      </div>

      ${section({
        title: market.Category,
        outcomes: market.Outcomes,
        intro: market.Intro,
        pros: prosMarket,
        conIntro: market['Con Intro'],
        cons: consMarket,
        outro: market.Outro,
        totalOfStar: market.Stars,
      })}

      ${section({
        title: productDev.Category,
        outcomes: productDev.Outcomes,
        intro: productDev.Intro,
        pros: prosProductDev,
        conIntro: productDev['Con Intro'],
        cons: consProductDev,
        outro: productDev.Outro,
        totalOfStar: productDev.Stars,
      })}

      ${section({
        title: creatorProduct.Category,
        outcomes: creatorProduct.Outcomes,
        intro: creatorProduct.Intro,
        pros: prosCreatorProduct,
        conIntro: creatorProduct['Con Intro'],
        cons: consCreatorProduct,
        outro: creatorProduct.Outro,
        totalOfStar: creatorProduct.Stars,
      })}

      ${outro()}
     
    </div>
    `;

    const html = rawHtml.replace('[[[[parseComponents]]]]', customHtml);

    const document = {
      html,
      data: {},
      type: 'buffer',
    };

    const options = {
      timeout: 540000,
      format: 'A4',
      orientation: 'portrait',
      header: {
        height: '10mm',
      },
      footer: {
        height: '20mm',
        contents: {
          last: `
          <div style="text-align: center; font-size: 10px;">
            <span class="text">Submit a new idea at</span> 
            <a href="https://makexnow.com/analyzer" style="color: #18859F; font-weight: 700; font-size: 10px;">makeXnow.com/Analyzer</a>
          </div>`,
        },
      },
    };

    const buffer = await pdf.create(document, options);

    const base64 = Buffer.from(buffer).toString('base64');

    // const outputPath = path.join(__dirname, '../result.pdf');
    // fs.writeFileSync(outputPath, buffer);

    return res.json({
      success: true,
      base64,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = { getQuestions, generatePDF };
