// warmup.js — fixed exercise bank + daily rotation. Same content/philosophy as
// the Swift version: not "365 unique days", a maintainable bank rotated by day.
'use strict';

var AF = window.AF || {};
window.AF = AF;

AF.WarmupBank = [
  // Breathing
  { id: 'br_01', category: 'Дыхание', title: 'Диафрагмальное дыхание', duration: 60,
    text: 'Одна рука на груди, другая на животе. Вдох носом на 4 счёта — двигается только живот. Выдох ртом на 6 счётов. 6 повторов.' },
  { id: 'br_02', category: 'Дыхание', title: 'Счёт на выдохе', duration: 90,
    text: 'Глубокий вдох, на выдохе считайте вслух ровным голосом как можно дальше (1, 2, 3…), не форсируя звук. 4 подхода.' },
  { id: 'br_03', category: 'Дыхание', title: 'Шипящий выдох (S)', duration: 60,
    text: 'Вдох на 4 счёта, выдох через звук [s] ровной струёй 10–15 секунд, без рывков.' },
  { id: 'br_04', category: 'Дыхание', title: 'Рёберное дыхание', duration: 60,
    text: 'Руки на нижних рёбрах. Вдох — рёбра расширяются в стороны, плечи неподвижны. 8 медленных циклов.' },

  // Articulation
  { id: 'ar_01', category: 'Артикуляция', title: 'Разминка языка', duration: 45,
    text: 'Кончиком языка обвести по кругу вдоль дёсен за зубами, 10 раз в каждую сторону.' },
  { id: 'ar_02', category: 'Артикуляция', title: 'Разминка губ', duration: 30,
    text: 'Чередуйте широкую улыбку и вытянутые в трубочку губы, 10 раз, с фиксацией на 2 секунды в каждом положении.' },
  { id: 'ar_03', category: 'Артикуляция', title: 'Разминка челюсти', duration: 30,
    text: 'Медленно откройте рот максимально широко, задержите 2 секунды, закройте. 8 повторов, без щелчков и боли.' },
  { id: 'ar_04', category: 'Артикуляция', title: 'Motorboat lips', duration: 30,
    text: 'Расслабленные губы, выдох со звуком «брррр» (как у лошади). 6 подходов по 3–4 секунды.' },
  { id: 'ar_05', category: 'Артикуляция', title: 'Растяжка щёк', duration: 20,
    text: 'Надуть обе щеки, перегонять воздух из одной в другую 10 раз.' },

  // English sounds
  { id: 'sd_th_1', category: 'Звуки', title: 'Звук [θ] (thin)', duration: 60,
    text: 'Кончик языка между зубами, лёгкий выдох без голоса. Слова: think, three, thanks, birthday, mouth. По 5 раз каждое.' },
  { id: 'sd_th_2', category: 'Звуки', title: 'Звук [ð] (this)', duration: 60,
    text: 'Та же позиция языка, но с голосом. Слова: this, that, mother, brother, weather. По 5 раз каждое.' },
  { id: 'sd_r', category: 'Звуки', title: 'Звук [r] (английский)', duration: 60,
    text: 'Язык не касается нёба, кончик слегка загнут назад. Слова: red, right, world, girl, really. По 5 раз.' },
  { id: 'sd_w_v', category: 'Звуки', title: '[w] vs [v]', duration: 60,
    text: '[w] — губы трубочкой, без зубов. [v] — верхние зубы на нижней губе. Пары: wet/vet, west/vest, wine/vine.' },
  { id: 'sd_ae', category: 'Звуки', title: 'Звук [æ] (cat)', duration: 45,
    text: 'Рот шире, чем для русского «э». Слова: cat, hat, bad, apple, black. По 5 раз каждое.' },
  { id: 'sd_schwa', category: 'Звуки', title: 'Редуцированный [ə] (schwa)', duration: 45,
    text: 'Расслабленный нейтральный звук в безударных слогах. Слова: about, sofa, banana, camera, upon.' },
  { id: 'sd_ng', category: 'Звуки', title: 'Звук [ŋ] (sing)', duration: 45,
    text: 'Задняя часть языка к мягкому нёбу, без [g] на конце. Слова: sing, morning, thinking, longer.' },
  { id: 'sd_h', category: 'Звуки', title: 'Звук [h]', duration: 30,
    text: 'Лёгкий выдох без напряжения горла (не как русское «х»). Слова: house, happy, hello, ahead.' },

  // Minimal pairs
  { id: 'mp_01', category: 'Минимальные пары', title: 'ship / sheep', duration: 45,
    text: 'Короткий [ɪ] vs долгий [iː]. Проговорить пары по 5 раз, слушая разницу в длине гласной.' },
  { id: 'mp_02', category: 'Минимальные пары', title: 'bed / bad', duration: 45,
    text: '[e] vs [æ]. Пары: bed/bad, said/sad, head/had.' },
  { id: 'mp_03', category: 'Минимальные пары', title: 'full / fool', duration: 45,
    text: '[ʊ] vs [uː]. Пары: full/fool, pull/pool, look/Luke.' },
  { id: 'mp_04', category: 'Минимальные пары', title: 'light / right', duration: 45,
    text: '[l] vs [r]. Пары: light/right, collect/correct, glass/grass.' },
  { id: 'mp_05', category: 'Минимальные пары', title: 'thin / sin / fin', duration: 45,
    text: '[θ] vs [s] vs [f]. Проговорить тройками, чувствуя разное положение языка/губ.' },
  { id: 'mp_06', category: 'Минимальные пары', title: 'cheap / jeep', duration: 45,
    text: '[tʃ] vs [dʒ]. Пары: cheap/jeep, chain/Jane, choke/joke.' },

  // Tongue twisters
  { id: 'tt_01', category: 'Скороговорки', title: 'She sells sea shells', duration: 45,
    text: '"She sells seashells by the seashore." Сначала медленно и чётко, затем постепенно быстрее.' },
  { id: 'tt_02', category: 'Скороговорки', title: 'Peter Piper', duration: 45,
    text: '"Peter Piper picked a peck of pickled peppers." Акцент на чёткое [p] без смазывания.' },
  { id: 'tt_03', category: 'Скороговорки', title: 'Red lorry, yellow lorry', duration: 45,
    text: '"Red lorry, yellow lorry" — повторить 5 раз подряд, следя за [r] и [l].' },
  { id: 'tt_04', category: 'Скороговорки', title: 'Betty Botter', duration: 45,
    text: '"Betty Botter bought some butter." Следить за чётким [t] и [b] без оглушения.' },
  { id: 'tt_05', category: 'Скороговорки', title: 'How much wood', duration: 45,
    text: '"How much wood would a woodchuck chuck if a woodchuck could chuck wood?"' },
  { id: 'tt_06', category: 'Скороговорки', title: 'Six thick thistle sticks', duration: 30,
    text: '"Six thick thistle sticks." Тренировка [θ] и [s] подряд без замены одного другим.' },

  // Rhythm & intonation
  { id: 'rh_01', category: 'Ритм и интонация', title: 'Stress-timing на счёте', duration: 45,
    text: '"ONE and TWO and THREE and FOUR" с равными интервалами между ударными слогами.' },
  { id: 'rh_02', category: 'Ритм и интонация', title: 'Восходящая/нисходящая интонация', duration: 45,
    text: '"Really?" с восходящей интонацией и "Really." с нисходящей. Чередуйте 6 раз.' },
  { id: 'rh_03', category: 'Ритм и интонация', title: 'Логическое ударение', duration: 90,
    text: '"I didn\'t say she stole the money" — 7 раз, каждый раз с ударением на другом слове.' },
  { id: 'rh_04', category: 'Ритм и интонация', title: 'Связывание слов (linking)', duration: 45,
    text: '"Turn it off" слитно, как одно слово: "tur-ni-toff". 8 раз, ускоряя.' },
];

AF.WARMUP_CATEGORIES = ['Дыхание', 'Артикуляция', 'Звуки', 'Минимальные пары', 'Скороговорки', 'Ритм и интонация'];

AF.getWarmupSessionSet = function getWarmupSessionSet(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const dayOfYear = Math.floor(diff / 86400000);

  const result = [];
  for (const category of AF.WARMUP_CATEGORIES) {
    const pool = AF.WarmupBank.filter((e) => e.category === category);
    if (pool.length === 0) continue;
    result.push(pool[dayOfYear % pool.length]);
  }
  return result;
};
