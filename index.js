const { Client, Intents } = require('discord.js');
const { token } = require('./settings');
const bent = require('bent');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

const prefix = '!zms';

const helpText = `Usage:

Search texts:
` + prefix + ` <search text>

Show available indexes:
` + prefix + ` index

Set personal indexes:
` + prefix + ` index sho,mmk

Clear personal indexes:
` + prefix + ` index clear

Random:
` + prefix + ` rnd`;

const MAX_MESSAGE_SIZE = 2000;

const indexTitles = {
  bcr: "Blue Cliff Record",
  mmk: "Gateless Gate",
  bos: "Book of Serenity",
  sho: "Treasury of the Eye of True Teaching",
  mt: "The Measuring Tap",
  ev: "The Empty Valley Collection",
  zz: "Sayings of Joshu",
  pang: "Sayings of Layman P'ang",
  foyan: "Instant Zen (Foyan)",
  dong: "The Record of Tung-shan (Dongshan)",
  yun: "Zen Master Yunmen",
  ma: "Sun Face Buddha (Master Ma)",
  hb: "Transmission of Mind (Huangbo)",
  lin: "The Zen Teachings of Master Lin-Chi (Linji)",
  bzhang: "Sayings and Doings of Pai-chang (Baizhang)"
};

const sourceTextFromIndex = (index) => {
  if(indexTitles[index]) return indexTitles[index];
  return "Unknown";
};

const personalIndexes = {};

const setIndexes = (commandLine, msg) => {
  let selected = commandLine.split(',');
  if(selected.length == 0) {
    msg.channel.send("No indexes");
    return;
  }

  let indexes = [];
  for(var j in selected) {
    let index = selected[j].trim().toLowerCase();
    if(!indexTitles[index]) {
      msg.channel.send("Unknown index: " + index);
      return;
    }
    indexes.push(index);
  }

  personalIndexes[msg.author.id] = indexes;
  msg.channel.send("Indexes for " + msg.author.username + " set to " + indexes.toString());
};

const urlFunc = (searchText, author) => {
  let encodedText = encodeURIComponent(searchText);
  let indexes = personalIndexes[author.id] ? personalIndexes[author.id] : Object.keys(indexTitles).join();
  return 'https://zenmarrow.com/public_es/' + indexes + '/_search?size=1&q=' + encodedText;
};

const zmUrl = (searchText) => {
  let encodedText = encodeURIComponent(searchText);
  return 'https://zenmarrow.com/?q=' + encodedText;
};

const search = (searchText, msg) => {
  let url = urlFunc(searchText, msg.author);

  bent('json')(url).then((json) => {
    if(!json || !json.hits || !json.hits.hits) {
      msg.channel.send("There was a problem performing the search. Please try again later.");
      return;
    }

    let koans = json.hits.hits;
    if(koans.length === 0) {
      msg.channel.send('No results.');
    } else {
      for(var i in koans) {
        let koan = koans[i];
        let title = '**' + sourceTextFromIndex(koan._index) + ' #' + koan._id + ': ' + koan._source.name + '**';

        msg.channel.send(title);
        let caseText = koan._source.case;
        while(caseText.length > 0) {
          batch = caseText.slice(0, MAX_MESSAGE_SIZE);
          caseText = caseText.slice(MAX_MESSAGE_SIZE);
          msg.channel.send(batch);
        }
        msg.channel.send("More at: " + zmUrl(searchText));
      }
    }
  }).catch((err) => {
    msg.channel.send("Error: " + err.message);
  });
};

const getRandom = (msg) => {
  let seed = new Date().getTime();
  let q = {"size": 1,"query": {"function_score": {"functions": [{"random_score": {"seed": '' + seed }}]}}};

  bent('json')('https://zenmarrow.com/public_es/_search', q).then(json => {
    if(!json || !json.hits || !json.hits.hits) {
      msg.channel.send("There was a problem performing the search. Please try again later.");
      return;
    }

    let koans = json.hits.hits;
    if(koans.length === 0) {
      msg.channel.send('No results.');
    } else {
      for(var i in koans) {
        let koan = koans[i];
        let title = '**' + sourceTextFromIndex(koan._index) + ' #' + koan._id + ': ' + koan._source.name + '**';

        msg.channel.send(title);
        let caseText = koan._source.case;
        while(caseText.length > 0) {
          batch = caseText.slice(0, MAX_MESSAGE_SIZE);
          caseText = caseText.slice(MAX_MESSAGE_SIZE);
          msg.channel.send(batch);
        }
      }
    }
  }).catch(err => {
    msg.channel.send("Error: " + err.message);
  });
};

const showIndexes = (msg) => {
  let text = '';
  for(j in indexTitles) {
    text = text + j + ': ' + indexTitles[j] + '\n';
  }
  msg.channel.send(text);
};

client.on('ready', () => console.log('Ready!'));

client.on('message', (msg) => {
  if (msg.author.bot) return;

  if (!msg.content.startsWith(prefix)) return;

  let commandLine = msg.content.slice(prefix.length).trim();

  if(!commandLine || commandLine === "help" || commandLine === "--help" || commandLine === '-h') {
    msg.channel.send(helpText);
    return;
  }

  if(commandLine.startsWith('index')) {
    let indexes = commandLine.slice('index'.length).trim();

    if(!indexes) {
      showIndexes(msg);
    } else {
      if(indexes === 'clear') {
        personalIndexes[msg.author.id] = undefined;
        msg.channel.send('Cleared personal indexes for ' + msg.author.username);
      } else {
        setIndexes(indexes, msg);
      }
    }
  } else if(commandLine.startsWith('rnd')) {
    getRandom(msg);
  } else {
    search(commandLine, msg);
  }
});

client.login(token);
