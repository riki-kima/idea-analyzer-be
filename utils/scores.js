const { doc } = require('./authGoogle');

const getAssociates = ({ data, key, category }) => {
  const arr = Object.values(data);
  const filterByCategory = arr.filter((x) => x.category === category);

  const list = filterByCategory.reduce((prev, curr) => {
    if (Array.isArray(curr.value)) {
      const result = curr.value.map((x) => x[key]);
      return [...prev, ...result];
    }
    if (!curr[key]) return prev;
    return [...prev, curr[key]];
  }, []);

  return list.join('\n');
};

const getScore = async (category, totalScore) => {
  await doc.loadInfo();

  const sheetScore = doc.sheetsByTitle['Backend: Scores'];
  const scoreRows = await sheetScore.getRows();

  const scores = [];

  // collected scores data
  for (let i = 0; i < scoreRows.length; i++) {
    const score = scoreRows[i];
    const scoreObject = {
      Category: score.get('Category'),
      Outcomes: score.get('Outcomes'),
      Stars: score.get('Stars'),
      Points: score.get('Points'),
      Intro: score.get('Intro'),
      'Con Intro': score.get('Con Intro'),
      Outro: score.get('Outro'),
    };

    scores.push(scoreObject);
  }

  const groupedData = [];
  let lastCategory = '';

  // to fill empty Points
  for (let i = 0; i < scores.length; i++) {
    const item = scores[i];
    const key = item.Category;

    if (key !== '') {
      groupedData.push({ ...item, Outro: item.Outro || '' });
      lastCategory = key;
    } else {
      groupedData.push({
        ...item,
        Category: lastCategory,
        Points: item.Points || '0',
        Outro: item.Outro || '',
      });
    }
  }

  const scoresByCategory = groupedData.filter((x) => x.Category === category);

  const getLastExistScore = +[...scoresByCategory].pop().Points;
  const maxScore =
    +[...scoresByCategory].filter((x) => totalScore >= +x.Points).shift()
      ?.Points || 0;

  const res = scoresByCategory.find((x) => {
    if (totalScore <= getLastExistScore) return +x.Points === 0;
    if (totalScore >= maxScore) return +x.Points === maxScore;
    return +x.Points > totalScore;
  });

  return res;
};

const getOverallImage = async (totalScore) => {
  await doc.loadInfo();

  const sheetScoreImage = doc.sheetsByTitle['Score Image'];
  const scoreImageRows = await sheetScoreImage.getRows();

  const scoreImages = [];
  const images = await getImages();

  // collected score image data
  for (let i = 0; i < scoreImageRows.length; i++) {
    const scoreImage = scoreImageRows[i];
    const scoreImageObject = {
      Image: scoreImage.get('Image'),
      Points: +scoreImage.get('Points'),
    };

    scoreImages.push(scoreImageObject);
  }

  const maxScore = scoreImages.find((x) => x.Points <= totalScore)?.Points;

  const { Image } = scoreImages
    .filter((x) => {
      if (totalScore < x.Points) return x.Points === 0;
      if (totalScore > x.Points) return x.Points === maxScore;
      return x.Points <= totalScore;
    })
    .shift();

  const res = images.find((x) => x?.Filename === Image);
  const imageUrl = res['Image URL'];

  return imageUrl;
};

const getImages = async () => {
  await doc.loadInfo();

  const sheetImages = doc.sheetsByTitle['Images'];
  const imagesRows = await sheetImages.getRows();

  const images = [];

  // collected images data
  for (let i = 0; i < imagesRows.length; i++) {
    const image = imagesRows[i];
    const imageObject = {
      Filename: image.get('Filename'),
      'Image URL': image.get('Image URL'),
    };

    images.push(imageObject);
  }

  return images;
};

module.exports = { getScore, getAssociates, getOverallImage, getImages };
