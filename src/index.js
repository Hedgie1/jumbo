'use strict';

const cp = require('child_process');
const setTimeout = require('node:timers');
const delay = require('util').promisify(setTimeout);
const mineflayer = require('mineflayer');
const autoeat = require('mineflayer-auto-eat');
const dead = require('mineflayer-death-event');
const { pathfinder, Movements } = require('mineflayer-pathfinder');
const { GoalNear, GoalBlock, GoalFollow, GoalBreakBlock } = require('mineflayer-pathfinder').goals;
const pvp = require('mineflayer-pvp').plugin;
const vec3 = require('vec3');
const config = require('../config.json');

const rngLimit = 1000;
let nowAction,
  nowAttacking = false;
let fishingCheck1, fishingCheck2, check, botsToStart, nowBlock;

const syntax = {
  main: config.name,
  minions: `${config.nameMinions}_${rngLimit}`,
};

const options = {
  host: config.host,
  port: config.port,
  username: syntax.main,
  version: config.version,
};

const bot = mineflayer.createBot(options);
bot.once('end', reason => {
  console.log(`${config.name} left the server. Reason: ${reason}`);
});
bot.once('kicked', reason => {
  console.log(`${config.name} was kicked. Reason: ${reason}`);
});
bot.on('error', err => {
  console.log(err);
});

const plugins = [pathfinder, pvp, dead, autoeat];
bot.loadPlugins(plugins);

function system(bot) {
  bot.once('login', () => {
    const mcData = require('minecraft-data')(bot.version);

    if (config.authmePassword !== 'none') {
      bot.chat(`/register ${config.authmePassword} ${config.authmePassword}`);
      bot.chat(`/login ${config.authmePassword}`);
    }
    bot.chat(
      config.chatColors === false
        ? `${config.name} has joined the server! Have fun! o/`
        : `&a&l${config.name} &7has joined the server! Have fun! &fo/`,
    );
    console.log(`${config.name} joined the server.`);

    bot.autoEat.options.priority = 'foodPoints';
    bot.autoEat.options.bannedFood = [];
    bot.autoEat.options.eatingTimeout = 3;

    bot.on('health', () => {
      if (nowAction === false) {
        if (bot.food === 20) bot.autoEat.disable();
        else bot.autoEat.enable();
      } else {
        bot.autoEat.disable();
      }
    });

    const defaultMove = new Movements(bot, mcData);
    defaultMove.allow1by1towers = true;
    const scaffoldingBlocks = ['dirt', 'cobblestone', 'netherrack'];

    for (i = 0; i < scaffoldingBlocks.length; i++) {
      defaultMove.scafoldingBlocks.push(mcData.itemsByName[scaffoldingBlocks[i]].id);
    }

    bot.on('goal_reached', () => {
      console.log('Successfully reached the goal.');
    });

    bot.on('chat', async (username, message) => {
      if (username === bot.username) return;
      const target = bot.players[username] ? bot.players[username].entity : null;

      if (message === 'help') {
        bot.chat(
          config.chatColors === true
            ? '&7You can find list of all commands and actions at &chttps://github.com/hedgie1/jambo&7.'
            : 'You can find list of all commands and actions at https://github.com/hedgie1/jambo.',
        );
        console.log(`${username} executed 'help' command.`);
      }

      if (message === 'kill') {
        if (username !== config.myLeader) {
          return bot.chat(
            config.chatColors === true
              ? "&cERROR &7- You don't have permission to use this command!"
              : "ERROR - You don't have permission to use this command!",
          );
        }
        bot.chat('/kill');
        console.log(`${username} executed 'kill' command.`);
      }

      if (message === 'tp') {
        if (username !== config.myLeader) {
          return bot.chat(
            config.chatColors === true
              ? "&cERROR &7- You don't have permission to use this command!"
              : "ERROR - You don't have permission to use this command!",
          );
        }
        bot.chat(`/tp ${username}`);
        console.log(`${username} executed 'tp' command.`);
      }

      if (message === 'stop') {
        bot.pvp.stop();
        bot.pathfinder.stop();
        bot.chat(
          config.chatColors === true
            ? '&aI stopped attacking and all actions.'
            : 'I stopped attacking and all actions.',
        );
        nowAction = false;
        nowAttacking = false;
        console.log(`${username} stopped my actions.`);
        bot.stopDigging();
      }

      if (message.startsWith('spawn')) {
        let args = message.split(' ');
        if (!args[1]) {
          return bot.chat(
            config.chatColors === true
              ? '&cERROR &7- Invalid usage! Use &espawn <number>&7.'
              : "ERROR - Invalid usage! Use 'spawn <number>'.",
          );
        }
        let g = parseInt(args[1]);
        if (!g || g === null || g === NaN || g === 0) {
          return bot.chat(
            config.chatColors === true
              ? '&cERROR &7- Invalid usage! Use &espawn <number>&7.'
              : "ERROR - Invalid usage! Use 'spawn <number>'.",
          );
        }

        botsToStart = [];

        for (i = 0; i < g; i++) {
          let x = syntax.minions;
          let y = x.replace(rngLimit, Math.round(Math.random() * rngLimit));
          botsToStart.push({ username: y });
        }
        bot.chat(
          config.chatColors === true
            ? `&aSpawning &e${botsToStart.length} &aminions and it is going to take &e${
                botsToStart.length * (config.startDelayInMS / 1000)
              } &aseconds!`
            : `Spawning ${botsToStart.length} minions and it is going to take ${
                botsToStart.length * (config.startDelayInMS / 1000)
              } seconds!`,
        );
        console.log(`Spawning ${botsToStart.length} minions.`);
        function startBot(botName) {
          const command = `node minions.js ${botName}`;
          cp.exec(command, (err, stdout, stderr) => {
            if (err) {
              console.log(`Error while starting ${botName}: ${err}`);
              console.log(`Minion crashed: ${botName}`);
              console.log(`Restarting minion ${botName}...`);
              setTimeout(() => startBot(botName), 1000);
            } else if (stdout) {
              console.log(`Stdout: ${stdout}`);
            } else if (stderr) {
              console.log(`Stderr: ${stderr}`);
            }
          });
        }

        let k = 0;
        async function systemMinion() {
          if (g === 0) return;
          await delay(2000);
          const botToStart = botsToStart[k];
          k++;
          if (k <= botsToStart.length) {
            setTimeout(() => {
              startBot(botToStart.username);
              systemMinion();
            }, config.startDelayInMS);
          }
        }

        systemMinion();
      }

      /** *
       *              _   _             _
       *         /\  | | | |           | |
       *        /  \ | |_| |_ __ _  ___| | __
       *       / /\ \| __| __/ _` |/ __| |/ /
       *      / ____ \ |_| || (_| | (__|   <
       *     /_/    \_\__|\__\__,_|\___|_|\_\
       *
       *
       */

      if (message.startsWith('attack')) {
        if (nowAction === true) {
          return bot.chat(
            config.chatColors === true
              ? '&cERROR &7- There is an ongoing action. Type &astop &7to end the action.'
              : "ERROR - There is an ongoing action. Type 'stop' to end the action.",
          );
        }

        let args = message.split(' ');
        if (args.length < 2 || args.length > 2) {
          return bot.chat(
            config.chatColors === true
              ? '&cERROR &7- Invalid usage! Use &aattack &e<me/nearest/name of player> instead.'
              : 'ERROR - Invalid usage! Use: attack <me/nearest/name of player> instead.',
          );
        }

        if (args[1] === 'nearest') nearest();
        else if (args[1] === 'me') me();
        else player();

        async function nearest() {
          if (nowAttacking !== false) {
            return bot.chat(
              config.chatColors === true ? '&cERROR &7- I am already attacking!' : 'ERROR - I am already attacking!',
            );
          }
          nowAttacking = true;
          bot.chat(
            config.chatColors === true
              ? '&aI started attacking the nearest player! Type &cstop &ato stop.'
              : "I started attacking the nearest player! Type: 'stop' to stop.",
          );
          let nearest = bot.nearestEntity(({ type }) => type === 'player');
          if (!nearest) {
            return bot.chat(
              config.chatColors === true ? "&cERROR - &7I can't find the player!" : "ERROR - I can't find the player!",
            );
          }
          bot.pvp.attack(nearest);
          console.log('Attacking nearest player.');
        }

        async function me() {
          if (nowAttacking !== false) {
            return bot.chat(
              config.chatColors === true ? '&cERROR &7- I am already attacking!' : 'ERROR - I am already attacking!',
            );
          }
          if (!target) {
            return bot.chat(
              config.chatColors === true ? "&cERROR - &7I can't find the player!" : "ERROR - I can't find the player!",
            );
          }
          nowAttacking = true;
          bot.chat(
            config.chatColors === true
              ? '&aI started attacking you! Type &cstop &ato stop.'
              : "I started attacking you! Type: 'stop' to stop.",
          );
          bot.pvp.attack(target);
          console.log(`Attacking ${username}`);
        }

        async function player() {
          if (nowAttacking !== false) {
            return bot.chat(
              config.chatColors === true ? '&cERROR &7- I am already attacking!' : 'ERROR - I am already attacking!',
            );
          }
          let player = bot.players[args[1]] ? bot.players[args[1]].entity : null;
          if (!player) {
            return bot.chat(
              config.chatColors === true ? "&cERROR - &7I can't find the player!" : "ERROR - I can't find the player!",
            );
          }
          if (player.username === bot.username) {
            return bot.chat(
              config.chatColors === true ? "&cERROR &7- I can't fight myself!" : "ERROR - I can't fight myself!",
            );
          }
          nowAttacking = true;
          bot.chat(
            config.chatColors === true
              ? `&aI started attacking &7${player.username}&a! Type &cstop &ato stop.`
              : `I started attacking ${player.username}! Type: 'stop' to stop.`,
          );
          bot.pvp.attack(player);
          console.log(`Attacking ${args[1]}`);
        }
      }

      /** *
       *      _____                      _
       *     |_   _|                    | |
       *       | |  _ ____   _____ _ __ | |_ ___  _ __ _   _
       *       | | | '_ \ \ / / _ \ '_ \| __/ _ \| '__| | | |
       *      _| |_| | | \ V /  __/ | | | || (_) | |  | |_| |
       *     |_____|_| |_|\_/ \___|_| |_|\__\___/|_|   \__, |
       *                                                __/ |
       *                                               |___/
       */

      if (message.startsWith('inv') || message.startsWith('inventory')) {
        let args = message.split(' ');
        if (!args[1]) {
          return bot.chat(
            config.chatColors === true
              ? '&cERROR &7- Invalid usage! Use &ainv &e<drop/equip/deposit> &7instead.'
              : "ERROR - Invalid usage! Use: 'inv <drop/equip/deposit>' instead.",
          );
        }
        if (args[1] !== 'drop' && args[1] !== 'equip' && args[1] !== 'deposit') {
          return bot.chat(
            config.chatColors === true
              ? '&cERROR &7- Invalid usage! Use &ainv &e<drop/equip/deposit> &7instead.'
              : "ERROR - Invalid usage! Use: 'inv <drop/equip/deposit>' instead.",
          );
        }
        if (args[1] === 'drop' && !args[2]) {
          return bot.chat(
            config.chatColors === true
              ? '&cERROR &7- Invalid usage! Use &ainv &adrop &e<all/name of item> &7instead.'
              : "ERROR - Invalid usage! Use: 'inv drop <all/name of item>' instead.",
          );
        }
        if (args[1] === 'equip' && !args[2]) {
          return bot.chat(
            config.chatColors === true
              ? '&cERROR &7- Invalid usage! Use &ainv equip &e<item> &7instead.'
              : "ERROR - Invalid usage! Use: 'inv equip <item>' instead.",
          );
        }

        if (args[1] === 'drop') {
          if (args[2] === 'all') {
            const drop = () => {
              if (!bot.inventory.items()[0]) return;
              bot.toss(bot.inventory.items()[0].type, null, 64, () => {
                drop();
              });
            };

            drop();
            bot.chat(config.chatColors === true ? '&aI tossed all of my items!' : 'I tossed all of my items!');
            console.log('I tossed all of my items.');
          } else {
            let itemType = mcData.itemsByName[args[2]];
            if (!itemType) {
              return bot.chat(
                config.chatColors === true
                  ? `&cERROR &7- I don't know any items by name &a${args[2]}&7.`
                  : `ERROR - I don't know any items by name ${args[2]}.`,
              );
            }
            let dropItem = bot.inventory.items().find(item => item.name === args[2]);
            if (!dropItem) {
              return bot.chat(
                config.chatColors === true
                  ? `&cERROR &7- I don't have &a${args[2]}&7 in my inventory.`
                  : `ERROR - I don't have ${args[2]} in my inventory.`,
              );
            }
            bot.tossStack(dropItem);
            bot.chat(config.chatColors === true ? `&aI tossed &7${args[2]}&a!` : `I tossed ${args[2]}!`);
            console.log(`I tossed ${args[2]}`);
          }
        }
        if (args[1] === 'equip') {
          let itemType = mcData.itemsByName[args[2]];
          if (!itemType) {
            return bot.chat(
              config.chatColors === true
                ? `&cERROR &7- I don't know any items by name &a${args[2]}&7.`
                : `ERROR - I don't know any items by name ${args[2]}.`,
            );
          }
          let dropItem = bot.inventory.items().find(item => item.name === args[2]);
          if (!dropItem) {
            return bot.chat(
              config.chatColors === true
                ? `&cERROR &7- I don't have &a${args[2]}&7 in my inventory.`
                : `ERROR - I don't have ${args[2]} in my inventory.`,
            );
          }
          bot.equip(dropItem);
          bot.chat(config.chatColors === true ? `&aI equipped &7${args[2]}&a!` : `I equipped ${args[2]}!`);
          console.log(`I equipped ${args[2]}`);
        }
        if (args[1] === 'deposit') {
          if (nowAction === true || nowAttacking === true) {
            return bot.chat(
              config.chatColors === true
                ? '&cERROR &7- There is an ongoing action. Type &estop &7to stop the action.'
                : "ERROR - There is an ongoing action. Type: 'stop' to stop the action.",
            );
          }
          deposit();
        }
      }

      /** *
       *                   _   _
       *         /\       | | (_)
       *        /  \   ___| |_ _  ___  _ __  ___
       *       / /\ \ / __| __| |/ _ \| '_ \/ __|
       *      / ____ \ (__| |_| | (_) | | | \__ \
       *     /_/    \_\___|\__|_|\___/|_| |_|___/
       *
       *
       */

      if (message.startsWith('action')) {
        if (nowAttacking === true) {
          return bot.chat(
            config.chatColors === true
              ? "&cERROR &7- You can't use this command while I am attacking!"
              : "ERROR - You can't use this command while I am doing attacking!",
          );
        }

        let args = message.split(' ');
        if (args.length < 2) {
          return bot.chat(
            config.chatColors === true
              ? '&cERROR &7- Invalid usage! Use &aaction &e<action> &7(List of actions: &ahelp&7).'
              : 'ERROR - Invalid usage! Use: action <action> (List of actions: help).',
          );
        }
        if (
          args[1] !== 'fish' &&
          args[1] !== 'collect' &&
          args[1] !== 'come' &&
          args[1] !== 'sleep' &&
          args[1] !== 'harvest' &&
          args[1] !== 'tower' &&
          args[1] !== 'follow'
        ) {
          return bot.chat(
            config.chatColors === true
              ? '&cERROR &7- Invalid usage! Use &aaction &e<action> &7(List of actions: &ahelp&7).'
              : 'ERROR - Invalid usage! Use: action <action> (List of actions: help).',
          );
        }
        if (args[1] === 'fish') fish();
        if (args[1] === 'collect') collect();
        if (args[1] === 'harvest') harvest();
        if (args[1] === 'come') comeCMD();
        if (args[1] === 'tower') tower();
        if (args[1] === 'sleep') sleep();
        if (args[1] === 'follow') followCMD();

        function fish() {
          if (nowAction === true || nowAttacking === true) {
            return bot.chat(
              config.chatColors === true
                ? '&cERROR &7- There is an ongoing action. Type &estop &7to stop the action.'
                : "ERROR - There is an ongoing action. Type: 'top' to stop the action.",
            );
          }
          if (!args[2]) {
            return bot.chat(
              config.chatColors === true
                ? '&cERROR &7- Invalid usage! Use &afish &e<time>&7.'
                : "ERROR - Invalid usage! Use 'fish <time>'",
            );
          }
          check = parseInt(args[2]);
          if (check === NaN || !check || check < 1 || check === null) {
            return bot.chat(
              config.chatColors === true
                ? '&cERROR &7- Invalid usage! Use &afish &e<time>&7.'
                : "ERROR - Invalid usage! Use 'fish <time>'",
            );
          }

          const water = bot.findBlocks({
            matching: mcData.blocksByName.water.id,
            maxDistance: 64,
            count: 1,
          });

          if (!water) {
            return bot.chat(
              config.chatColors === true ? "&cERROR &7- I can't find water!" : "ERROR - I can't find water!",
            );
          }

          fishingCheck1 = 1;
          fishingCheck2 = 1;
          nowAction = true;
          let w = bot.blockAt(water[0]);
          let v = bot.blockAt(w.position.offset(0, 1, 0));

          bot.pathfinder.setMovements(defaultMove);
          bot.pathfinder.setGoal(new GoalNear(w.position.x, w.position.y, w.position.z, 3));
          bot.chat(config.chatColors === true ? '&7Looking for water...' : 'Looking for water...');
          console.log('Fishing - Looking for water..');

          bot.once('goal_reached', () => {
            bot.lookAt(v.position, false, () => {});
            console.log('I started fishing.');
          });
        }

        function comeCMD() {
          if (nowAction === true || nowAttacking === true) {
            return bot.chat(
              config.chatColors === true
                ? '&cERROR &7- There is an ongoing action. Type &estop &7to stop the action.'
                : "ERROR - There is an ongoing action. Type: 'stop' to stop the action.",
            );
          }
          if (!target) return bot.chat(config.chatColors === true ? "&cERROR &7- I don't see you!" : "ERROR - I don't see you!");
          bot.pathfinder.stop();
          const p = target.position;
          bot.chat(config.chatColors === true ? '&aI am going to your position!' : 'I am going to your position!');
          bot.pathfinder.setMovements(defaultMove);
          bot.pathfinder.setGoal(new GoalNear(p.x, p.y, p.z, 1));
          console.log(`I am going to ${username}'s position.`);
        }

        function followCMD() {
          if (nowAction === true || nowAttacking === true) {
            return bot.chat(
              config.chatColors === true
                ? '&cERROR &7- There is an ongoing action. Type &estop &7to stop the action.'
                : "ERROR - There is an ongoing action. Type: 'stop' to stop the action.",
            );
          }
          if (!target) return bot.chat(config.chatColors === true ? "&cERROR - &7I can't find you!" : "ERROR - I can't find you!");
          bot.chat(
            config.chatColors === true
              ? "&aI'll follow you from now on! To stop the process, type &estop&a."
              : "I'll follow you from now on! To stop the process, type 'stop'.",
          );
          bot.pathfinder.stop();
          bot.pathfinder.setMovements(defaultMove);
          bot.pathfinder.setGoal(new GoalFollow(target, 1), true);
          console.log(`I am following ${username}`);
        }

        async function tower() {
          if (nowAction === true || nowAttacking === true) {
            return bot.chat(
              config.chatColors === true
                ? '&cERROR &7- There is an ongoing action. Type &estop &7to stop the action.'
                : "ERROR - There is an ongoing action. Type: 'stop' to stop the action.",
            );
          }
          if (!args[2]) {
            return bot.chat(
              config.chatColors === true
                ? '&cERROR &7- Nesprávne použitie! Použi &aaction tower &e<blocks>&7.'
                : "ERROR - Nesprávne použitie! Použi 'action tower <blocks>'.",
            );
          }
          let x = parseInt(args[2]);
          if (!x) {
            return bot.chat(
              config.chatColors === true
                ? '&cERROR &7- Nesprávne použitie! Použi &aaction tower &e<blocks>&7.'
                : "ERROR - Nesprávne použitie! Použi 'action tower <blocks>'.",
            );
          }
          if (x > 64) {
            return bot.chat(
              config.chatColors === true
                ? '&cERROR &7- Maximum size of the tower can be &a64 &7blocks!'
                : 'ERROR - Maximum size of the tower can be 64 blocks!',
            );
          }
          const towerItem = bot.inventory.items().find(item => item.name === config.towerBlock);
          if (!towerItem) {
            return bot.chat(
              config.chatColors === true
                ? `&cERROR &7- I need &a${x} &e${config.towerBlock} &7and I only have &a0!`
                : `ERROR - I need ${x} ${config.towerBlock} and I only have 0!`,
            );
          }
          if (towerItem.count < x) {
            return bot.chat(
              config.chatColors === true
                ? `&cERROR &7- I need &a${x} &e${config.towerBlock} &7and I only have &a${towerItem.count}!`
                : `ERROR - I need ${x} ${config.towerBlock} and I only have ${towerItem.count}!`,
            );
          }
          bot.chat(
            config.chatColors === true
              ? `&aI started building &e${x} &ablocks high tower!`
              : `I started building ${x} blocks high tower!`,
          );
          console.log(`I started building ${x} blocks high tower.`);
          nowAction = true;
          for (i = 0; i < x; i++) {
            bot.equip(towerItem, 'hand');
            const towerBlock = bot.blockAt(bot.entity.position.offset(0, -1, 0));
            const jumpY = Math.floor(bot.entity.position.y) + 1.0;
            bot.setControlState('jump', true);
            bot.on('move', placeIfHighEnough);
            let tryCount = 0;

            async function placeIfHighEnough() {
              if (bot.entity.position.y > jumpY) {
                bot.placeBlock(towerBlock, vec3(0, 1, 0), err => {
                  if (err) {
                    tryCount++;
                    if (tryCount > 10) {
                      console.error(err.message);
                      bot.setControlState('jump', false);
                      bot.removeListener('move', placeIfHighEnough);
                      return;
                    }
                    return;
                  }
                  bot.setControlState('jump', false);
                  bot.removeListener('move', placeIfHighEnough);
                });
              }

              if (x - 1 === i) return (nowAction = false);
            }
            await delay(600);
          }
        }

        async function sleep() {
          if (nowAction === true || nowAttacking === true) {
            return bot.chat(
              config.chatColors === true
                ? '&cERROR &7- There is an ongoing action. Type &estop &7to stop the action.'
                : "ERROR - There is an ongoing action. Type: 'stop' to stop the action.",
            );
          }
          const thunderstorm = bot.isRaining && bot.thunderState > 0;
          if (thunderstorm || !(bot.time.timeOfDay >= 12541 && bot.time.timeOfDay <= 23458)) {
            return bot.chat(
              config.chatColors === true
                ? '&cERROR &7- I can sleep only during night or thunderstorm!'
                : 'ERROR - I can sleep only during night or thunderstorm!',
            );
          }

          let bed = bot.findBlocks({
            matching: blk => bot.isABed(blk),
            maxDistance: 64,
            count: 1,
          });

          try {
            if (bed[0]) {
              let bedAt = bot.blockAt(bed[0]);
              bot.pathfinder.setMovements(defaultMove);
              bot.pathfinder.setGoal(new GoalNear(bedAt.position.x, bedAt.position.y, bedAt.position.z, 1));
              bot.chat(config.chatColors === true ? '&aLooking for bed..' : 'Looking for bed..');
              console.log('SLEEP - Looking for bed...');

              bot.once('goal_reached', () => {
                goSleep();
              });

              async function goSleep() {
                bot.chat(config.chatColors === true ? '&aSleeping...' : 'Sleeping...');
                console.log('Sleeping..');
                await bot
                  .sleep(bedAt)
                  .catch(err => bot.chat(config.chatColors === true ? `&cERROR &7- ${err}` : `ERROR - ${err}`));
              }
            } else {
              bot.chat(
                config.chatColors === true ? "&cERROR &7- I don't see any bed!" : "ERROR - I don't see any bed!",
              );
            }
          } catch (err) {
            console.log(err);
            bot.chat(
              config.chatColors === true
                ? '&cError occured while executing command, check console.'
                : 'Error occured while executing command, check console.',
            );
          }
        }

        async function harvest() {
          if (nowAction === true || nowAttacking === true) {
            return bot.chat(
              config.chatColors === true
                ? '&cERROR &7- There is an ongoing action. Type &astop &7to stop the action.'
                : "ERROR - There is an ongoing action. Type: 'stop' to stop the action.",
            );
          }
          let checkCount;
          let crop = [];
          if (!args[2] || !args[3]) {
            return bot.chat(
              config.chatColors === true
                ? '&cERROR &7- Invalid usage! Use &aaction harvest &e<count> <carrot/potato/wheat> &7instead.'
                : "ERROR - Invalid usage! Use 'action harvest <count> <carrot/potato/wheat>' instead.",
            );
          }
          checkCount = parseInt(args[2]);
          if (check === NaN) {
            return bot.chat(
              config.chatColors === true
                ? '&cERROR &7- Invalid usage! Use &aaction harvest &e<count> <carrot/potato/wheat> &7instead.'
                : "ERROR - Invalid usage! Use 'action harvest <count> <carrot/potato/wheat>' instead.",
            );
          }
          if (args[3] !== 'carrot' && args[3] !== 'potato' && args[3] !== 'wheat') {
            return bot.chat(
              config.chatColors === true
                ? '&cERROR &7- Invalid usage! Use &aaction harvest &e<count> <carrot/potato/wheat> &7instead.'
                : "ERROR - Invalid usage! Use 'action harvest <count> <carrot/potato/wheat>' instead.",
            );
          }

          if (args[3] === 'carrot') crop = ['carrots', 'carrot'];
          if (args[3] === 'potato') crop = ['potatoes', 'potato'];
          if (args[3] === 'wheat') crop = ['wheat', 'wheat_seeds'];

          nowAction = true;
          let harvestBlock = bot.findBlocks({
            matching: block => block.name === crop[0] && block.metadata === 7,
            count: checkCount,
            maxDistance: 64,
          });

          if (harvestBlock[0]) {
            bot.chat(
              config.chatColors === true
                ? `&aI found &c${harvestBlock.length} &e${crop[0]}&a!`
                : `I found ${harvestBlock.length} ${crop[0]}!`,
            );
            console.log(`Harvesting ${harvestBlock.length} ${crop[0]}`);

            for (i = 0; i < harvestBlock.length; i++) {
              if (nowAction === false) return;
              let h = bot.blockAt(harvestBlock[i]);
              let { x, y, z } = h.position;
              let goal = new GoalBreakBlock(x, y, z, bot);
              let collect = new GoalBlock(x, y, z);
              let harvestMove = new Movements(bot, mcData);
              harvestMove.allowParkour = false;
              harvestMove.blocksToAvoid.add(mcData.blocksByName.water.id);
              harvestMove.blocksToAvoid.delete(mcData.blocksByName.wheat.id);
              harvestMove.blocksCantBreak.delete(mcData.blocksByName.wheat.id);
              bot.pathfinder.setMovements(harvestMove);
              await bot.pathfinder.goto(goal).catch(err => {});
              await bot.lookAt(h.position);
              await breakCrop();
              await bot.pathfinder.goto(collect).catch(err => {});

              async function breakCrop() {
                await bot.dig(h).catch(err => {
                  bot.chat(config.chatColors === true ? `&cERROR &7- ${err}` : `ERROR - ${err}`);
                });
                const seed = bot.inventory.items().find(item => item.name === crop[1]);
                await delay(1000);
                if (seed) await bot.equip(seed, 'hand');
                else return;

                let farmBlock = bot.blockAt(h.position.offset(0, -1, 0));
                await delay(500);
                await bot.placeBlock(farmBlock, vec3(0, 1, 0)).catch(err => {
                  bot.chat(config.chatColors === true ? `&cERROR &7- ${err}` : `ERROR - ${err}`);
                });
              }

              if (harvestBlock.length - 1 === i) {
                bot.chat(config.chatColors === true ? '&aHarvesting finished!' : 'Harvesting finished!');
                console.log('Harvesting finished.');
                nowAction = false;
                if (config.depositItems === true) await deposit();
              }
            }
          } else {
            bot.chat(config.chatColors === true ? `&cERROR &7- No ${crop[0]} found!` : `ERROR - No ${crop[0]} found!`);
          }
        }

        async function collect() {
          let countMine;
          if (nowAction === true || nowAttacking === true) {
            return bot.chat(
              config.chatColors === true
                ? '&cERROR &7- There is an ongoing action. Type &estop &7to stop the action.'
                : "ERROR - There is an ongoing action. Type: 'stop' to stop the action.",
            );
          }
          if (args.length === 4) {
            countMine = parseInt(args[2]);
          } else if (args.length === 3) {
            countMine = config.mineBlocksUndefined;
          }

          let type = args[2];
          if (args.length === 4) type = args[3];
          if (type === 'water' || type === 'air' || type === 'bedrock' || type === 'barrier') {
            return bot.chatbot.chat(
              config.chatColors === true
                ? '&cERROR &7- This block is blacklisted.'
                : 'ERROR - This block is blacklisted.',
            );
          }
          const blockType = mcData.blocksByName[type];

          if (!blockType) {
            return bot.chat(
              config.chatColors === true
                ? `&cERROR &7- I don't know any blocks by name &a${type}&7.`
                : `ERROR - I don't know any blocks by name ${type}.`,
            );
          }

          const blocks = bot.findBlocks({
            matching: blockType.id,
            maxDistance: 64,
            count: countMine,
          });

          if (blocks.length === 0) {
            return bot.chat(
              config.chatColors === true ? "&cERROR &7- I don't see this block." : "ERROR - I don't see this block.",
            );
          }

          nowAction = true;
          bot.chat(
            config.chatColors === true
              ? `&aI started collecting &e${blocks.length} &c${type}&a!`
              : `I started collecting ${blocks.length} ${type}!`,
          );
          console.log(`I started collecting ${blocks.length} ${type}.`);

          for (i = 0; i < Math.min(blocks.length, countMine); i++) {
            if (nowAction === false) return;
            nowBlock = bot.findBlocks({
              matching: blockType.id,
              maxDistance: 64,
              count: 1,
            });
            if (nowBlock.length === 0) {
              return bot.chat(
                config.chatColors === true ? "&cERROR &7- I don't see this block." : "ERROR - I don't see this block.",
              );
            }

            let m = bot.blockAt(nowBlock[0]);
            let { x, y, z } = m.position;
            let goal = new GoalBreakBlock(x, y, z, bot);
            let collect = new GoalBlock(x, y, z);
            bot.pathfinder.setMovements(defaultMove);
            await bot.pathfinder.goto(goal).catch(err => {});
            const tool = bot.pathfinder.bestHarvestTool(m);
            if (tool !== undefined && tool !== null) bot.equip(tool, 'hand');
            await bot.lookAt(m.position);
            await bot.dig(m).catch(err => {
              console.log(err);
            });
            await bot.pathfinder.goto(collect).catch(err => {});

            if (Math.min(blocks.length, countMine) - 1 === i) {
              bot.chat(config.chatColors === true ? '&aCollecting complete!' : 'Collecting complete!');
              console.log('Collecting complete.');
              nowAction = false;
              if (config.depositItems === true) deposit();
            }
          }
        }
      }
    });

    async function deposit() {
      let chests = bot.findBlocks({
        matching: mcData.blocksByName.chest.id,
        maxDistance: 64,
        count: 1,
      });

      if (!chests[0]) {
        return bot.chat(
          config.chatColors === true ? "&cERROR &7- I don't see any chest!" : "ERROR - I don't see any chest!",
        );
      }
      let ch = bot.blockAt(chests[0]);
      bot.pathfinder.setMovements(defaultMove);
      bot.pathfinder.setGoal(new GoalNear(ch.position.x, ch.position.y, ch.position.z, 3));
      bot.chat(config.chatColors === true ? '&7Looking for chest...' : 'Looking for chest...');
      console.log('Looking for chest..');

      bot.once('goal_reached', goal => {
        bot.lookAt(ch.position, false, () => {});
        depositItems();
      });

      async function depositItems() {
        let chest = await bot.openChest(ch);
        for (slot of bot.inventory.slots) {
          if (slot && slot !== null) {
            await chest.deposit(slot.type, null, slot.count);
          }
        }
        chest.close();
      }
    }

    bot.on('goal_reached', () => {
      if (fishingCheck2 === 1) {
        fishingOnce();
        setTimeout(() => {
          nowAction = false;
        }, check * 1000);
        fishingCheck2 = 0;
      }
    });

    bot.on('death', () => {
      bot.stopDigging();
      nowAction = false;
      nowAttacking = false;
    });

    bot.on('playerCollect', (collector, collected) => {
      if (collector.type === 'player' && collected.type === 'object' && collector.username === bot.username) {
        if (nowAction === false && fishingCheck1 === true) {
          const rawItem = collected.metadata[8];
          const id = rawItem.itemId;
          const itemName = mcData.findItemOrBlockById(id).displayName;

          bot.chat(
            config.chatColors === true ? `&6FISHING &7- I caught &a${itemName}&7!` : `FISHING - I caught ${itemName}!`,
          );
          console.log(`FISHING - I caught ${itemName}!`);
          bot.chat(
            config.chatColors === true
              ? '&6FISHING &7- &aI successfully finished fishing.'
              : 'FISHING - I successfully finished fishing.',
          );
          console.log('Successfully finished fishing.');
          fishingCheck1 = false;
          if (config.depositItems === true) deposit();
        } else if (nowAction === true && fishingCheck1 === true) {
          const rawItem = collected.metadata[8];
          const id = rawItem.itemId;
          const itemName = mcData.findItemOrBlockById(id).displayName;
          bot.chat(
            config.chatColors === true ? `&6FISHING &7- I caught &a${itemName}&7!` : `FISHING - I caught ${itemName}!`,
          );
          console.log(`FISHING - I caught ${itemName}!`);
          fishing();
        }
      }
    });

    async function fishingOnce() {
      const fishRod = bot.inventory.items().find(item => item.name.includes('fishing'));

      if (fishRod) {
        bot.equip(fishRod, 'hand');
        await delay(2000);
        bot.chat(
          config.chatColors === true ? `&7I will fish for &a${check}&7 seconds.` : `I will fish for ${check} seconds.`,
        );
        try {
          await bot.fish();
        } catch (err) {
          bot.chat(config.chatColors === true ? `&cERROR &7- ${err.message}` : `ERROR - ${err.message}`);
        }
      } else if (!fishRod) {
        nowAction = false;
        fishingCheck1 = 0;
        return bot.chat(
          config.chatColors === true
            ? "&cERROR &7- I don't have a fishing rod!"
            : "ERROR - I don't have a fishing rod!",
        );
      }
    }

    async function fishing() {
      const fishRod = bot.inventory.items().find(item => item.name.includes('fishing'));
      if (fishRod) {
        bot.equip(fishRod, 'hand');
        try {
          await bot.fish();
        } catch (err) {
          bot.chat(config.chatColors === true ? `&cERROR &7- ${err.message}` : `ERROR - ${err.message}`);
        }
      } else if (!fishRod) {
        nowAction = false;
        fishingCheck1 = 0;
        return bot.chat(
          config.chatColors === true
            ? "&cERROR &7- I don't have a fishing rod!"
            : "ERROR - I don't have a fishing rod!",
        );
      }
    }
  });
}

system(bot);
