const { Client } = require('discord.js');
const { token } = require('./settings');
const https = require('https');

const client = new Client();

const prefix = '!zms';

const helpText = `Usage:

Search texts:
` + prefix + ` <search text>

Show available indexes:
` + prefix + ` index

Set personal indexes:
` + prefix + ` index sho,mmk

Clear personal indexes:
` + prefix + ` index clear`;

const indexTitles = {
  bcr: "Blue Cliff Record",
  mmk: "Gateless Gate",
  bos: "Book of Serenity",
  sho: "Treasury of the Eye of True Teaching",
  zz: "Sayings of Joshu",
  pang: "Sayings of Layman P'ang",
  foyan: "Instant Zen (Foyan)",
  dong: "The Record of Tung-shan (Dongshan)",
  yun: "Zen Master Yunmen",
  ma: "Sun Face Buddha (Master Ma)"
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
    let index = selected[j].trim();
    if(!(index in indexTitles)) {
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
  return 'https://zenmarrow.com/es/' + indexes + '/_search?size=1&q=' + encodedText;
};

const zmUrl = (searchText) => {
  let encodedText = encodeURIComponent(searchText);
  return 'https://zenmarrow.com/?q=' + encodedText;
};

const search = (searchText, msg) => {
  let url = urlFunc(searchText, msg.author);

  https.get(url, (resp) => {
    let data = '';

    // A chunk of data has been recieved.
    resp.on('data', (chunk) => {
      data += chunk;
    });

    // The whole response has been received. Print out the result.
    resp.on('end', () => {
      //msg.channel.send(data);
      let json = JSON.parse(data);

      let koans = json.hits.hits;
      if(koans.length === 0) {
        msg.channel.send('No results.');
      } else {
        for(var i in koans) {
          let koan = koans[i];
          let title = '**' + sourceTextFromIndex(koan._index) + ' #' + koan._id + ': ' + koan._source.name + '**';

          msg.channel.send(title);
          let caseText = koan._source.case;
          if(caseText.length > 2000) {
            caseText = caseText.slice(0, 1997) + '...';
          }
          msg.channel.send(caseText);
          msg.channel.send("More at: " + zmUrl(searchText));
        }
      }
    });

  }).on("error", (err) => {
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

  if (msg.content.startsWith(prefix)) {
    let commandLine = msg.content.slice(prefix.length).trim();

    if(!commandLine || commandLine === "help" || commandLine === "--help" || commandLine === '-h') {
      msg.channel.send(helpText);
      return;
    }

    if(commandLine.startsWith('index')) {
      let indexes = commandLine.slice(6).trim();

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
    } else {
      search(commandLine, msg);
    }
  }
});

client.login(token);
