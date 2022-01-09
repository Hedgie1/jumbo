const botName = process.argv[2]
const mineflayer = require('mineflayer')
const { pathfinder, Movements } = require('mineflayer-pathfinder')
const { GoalNear, GoalBlock, GoalXZ, GoalY, GoalInvert, GoalFollow, GoalBreakBlock } = require('mineflayer-pathfinder').goals
const pvp = require('mineflayer-pvp').plugin
const config = require('./config.json');

let movements = [ 'forward', 'back', 'left', 'right']
let move;
let moving, fighting = false;

createNewBot(botName)

function createNewBot (botName) {
    
  const bot = mineflayer.createBot({
    username: botName,
    host: config.host,
    port: config.port,
    version: config.version
  })


  bot.once('login', () => {
    
    bot.loadPlugin(pathfinder)
    bot.loadPlugin(pvp)

    if(config.authmePassword != "none") { //Login if activated. You can modify this if you need.
      bot.chat("/register " + config.authmePassword + " " + config.authmePassword)
      bot.chat("/login " + config.authmePassword)
    }

    if (config.joinMessage != "") bot.chat(config.joinMessage)
    console.log(botName + " has joined the server!")
  })

    bot.on('chat', (username, message) => {
        let nearest = bot.nearestEntity(({ type }) => type === 'player')
        const target = bot.players[username] ? bot.players[username].entity : null
        if (username === bot.username) return

        //You can add your own commands here. Here are some sample commands!

        if(message === "army") {
          if (!target) return bot.chat(config.chatColors == true ? "&cERROR &7- I don't see you!" : "ERROR - I don't see you!")
            
          if(fighting == false) {
            bot.pvp.attack(target)
            fighting = true
          } 

          else {
              bot.pvp.stop()
              fighting = false
          }

          bot.once("death", () => {
            bot.pvp.stop();
          })         
      }

        if(message === 'leave') {
        bot.end()
        }


        if(message === 'random') {
          if(moving == true) {
            bot.setControlState(move,false);
            bot.setControlState('jump',false);
            moving = false
          } 
          
          else if (moving == false) {

            moving = true
            move = movements[Math.floor(Math.random() * movements.length)];

            for(i = 0; i < 99; i++) {     
              setTimeout(() => {
                if(moving == true) {
                    bot.setControlState('jump',true);
                    bot.setControlState(move,false);
                    move = movements[Math.floor(Math.random() * movements.length)];
                    bot.setControlState(move,true);
                }
              }, i*2000)  
            }
          }  
        }
      
    })


    
    

}
