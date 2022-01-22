'use strict'

const cp = require('child_process')
const delay = require('util').promisify(setTimeout)
const mineflayer = require('mineflayer')
const autoeat = require('mineflayer-auto-eat')
const dead = require('mineflayer-death-event')
const { pathfinder, Movements } = require('mineflayer-pathfinder')
const { GoalNear, GoalBlock, GoalFollow, GoalBreakBlock } = require('mineflayer-pathfinder').goals
const pvp = require('mineflayer-pvp').plugin
const vec3 = require('vec3')
const config = require('../config.json')

const rngLimit = 1000
let nowAction
let nowAttacking = false
let fishingCheck1, fishingCheck2, check, botsToStart, nowBlock

const syntax = {
  main: config.name,
  minions: `${config.nameMinions}_${rngLimit}`
}

const options = {
  host: config.host,
  port: config.port,
  username: syntax.main,
  version: config.version
}

const bot = mineflayer.createBot(options)
bot.once('end', reason => {
  console.log(`${config.name} left the server. Reason: ${reason}`)
})
bot.once('kicked', reason => {
  console.log(`${config.name} was kicked. Reason: ${reason}`)
})
bot.on('error', err => {
  console.log(err)
})

const plugins = [pathfinder, pvp, dead, autoeat]
bot.loadPlugins(plugins)

const system = () => {
  bot.once('spawn', () => {
    const mcData = require('minecraft-data')(bot.version)

    if (config.authmePassword !== 'none') {
      bot.chat(`/register ${config.authmePassword} ${config.authmePassword}`)
      bot.chat(`/login ${config.authmePassword}`)
    }

    bot.chat(
      config.chatColors === false
        ? `${config.name} has joined the server! Have fun! o/`
        : `&a&l${config.name} &7has joined the server! Have fun! &fo/`
    )
    console.log(`${config.name} joined the server.`)

    bot.autoEat.options.priority = 'foodPoints'
    bot.autoEat.options.bannedFood = []
    bot.autoEat.options.eatingTimeout = 3

    bot.on('health', () => {
      if (nowAction === false) {
        if (bot.food === 20) bot.autoEat.disable()
        else bot.autoEat.enable()
      } else {
        bot.autoEat.disable()
      }
    })

    const defaultMove = new Movements(bot, mcData)
    defaultMove.allow1by1towers = true
    const scaffoldingBlocks = ['dirt', 'cobblestone', 'netherrack']

    for (let i = 0; i < scaffoldingBlocks.length; i++) {
      defaultMove.scafoldingBlocks.push(mcData.itemsByName[scaffoldingBlocks[i]].id)
    }

    bot.on('goal_reached', () => {
      console.log('Successfully reached the goal.')
    })

    bot.on('chat', (username, message) => {
      if (username === bot.username) return
      const target = bot.players[username] ? bot.players[username].entity : null

      if (message === 'help') {
        bot.chat(
          config.chatColors
            ? '&7You can find list of all commands and actions at &chttps://github.com/hedgie1/jumbo&7.'
            : 'You can find list of all commands and actions at https://github.com/hedgie1/jumbo.'
        )
        console.log(`${username} executed 'help' command.`)
      }

      if (message === 'kill') {
        if (username !== config.myLeader) {
          bot.chat(
            config.chatColors
              ? "&cERROR &7- You don't have permission to use this command!"
              : "ERROR - You don't have permission to use this command!"
          )
          return
        }
        bot.chat('/kill')
        console.log(`${username} executed 'kill' command.`)
      }

      if (message === 'tp') {
        if (username !== config.myLeader) {
          bot.chat(
            config.chatColors
              ? "&cERROR &7- You don't have permission to use this command!"
              : "ERROR - You don't have permission to use this command!"
          )
          return
        }
        bot.chat(`/tp ${username}`)
        console.log(`${username} executed 'tp' command.`)
      }

      if (message === 'stop') {
        bot.pvp.stop()
        bot.pathfinder.stop()
        bot.chat(config.chatColors ? '&aI stopped attacking and all actions.' : 'I stopped attacking and all actions.')
        nowAction = false
        nowAttacking = false
        console.log(`${username} stopped my actions.`)
        bot.stopDigging()
      }

      if (message.startsWith('spawn')) {
        const args = message.split(' ')
        if (!args[1]) {
          bot.chat(
            config.chatColors
              ? '&cERROR &7- Invalid usage! Use &espawn <number>&7.'
              : "ERROR - Invalid usage! Use 'spawn <number>'."
          )
          return
        }
        const g = parseInt(args[1])
        if (!g || isNaN(g)) {
          bot.chat(
            config.chatColors
              ? '&cERROR &7- Invalid usage! Use &espawn <number>&7.'
              : "ERROR - Invalid usage! Use 'spawn <number>'."
          )
          return
        }

        botsToStart = []

        for (let i = 0; i < g; i++) {
          const x = syntax.minions
          const y = x.replace(rngLimit, Math.round(Math.random() * rngLimit))
          botsToStart.push({ username: y })
        }

        bot.chat(
          config.chatColors
            ? `&aSpawning &e${botsToStart.length} &aminions and it is going to take &e${
                botsToStart.length * (config.startDelayInMS / 1000)
              } &aseconds!`
            : `Spawning ${botsToStart.length} minions and it is going to take ${
                botsToStart.length * (config.startDelayInMS / 1000)
              } seconds!`
        )
        console.log(`Spawning ${botsToStart.length} minions.`)

        const startBot = botName => {
          const command = `node src/minions.js ${botName}`
          cp.exec(command, (err, stdout, stderr) => {
            if (err) {
              console.log(`Error while starting ${botName}: ${err}`)
              console.log(`Minion crashed: ${botName}`)
              console.log(`Restarting minion ${botName}...`)
              setTimeout(() => startBot(botName), 1000)
            } else if (stdout) {
              console.log(`Stdout: ${stdout}`)
            } else if (stderr) {
              console.log(`Stderr: ${stderr}`)
            }
          })
        }

        let k = 0
        const systemMinion = async () => {
          if (g === 0) return
          await delay(2000)
          const botToStart = botsToStart[k]
          k++
          if (k <= botsToStart.length) {
            setTimeout(() => {
              startBot(botToStart.username)
              systemMinion()
            }, config.startDelayInMS)
          }
        }

        systemMinion()
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
        if (nowAction) {
          bot.chat(
            config.chatColors
              ? '&cERROR &7- There is an ongoing action. Type &astop &7to end the action.'
              : "ERROR - There is an ongoing action. Type 'stop' to end the action."
          )
          return
        }

        const args = message.split(' ')
        if (args.length < 2 || args.length > 2) {
          bot.chat(
            config.chatColors
              ? '&cERROR &7- Invalid usage! Use &aattack &e<me/nearest/name of player> instead.'
              : 'ERROR - Invalid usage! Use: attack <me/nearest/name of player> instead.'
          )
          return
        }

        if (args[1] === 'nearest') nearest()
        else if (args[1] === 'me') me()
        else player()

        function nearest () {
          if (nowAttacking !== false) {
            bot.chat(config.chatColors ? '&cERROR &7- I am already attacking!' : 'ERROR - I am already attacking!')
            return
          }

          nowAttacking = true

          bot.chat(
            config.chatColors
              ? '&aI started attacking the nearest player! Type &cstop &ato stop.'
              : "I started attacking the nearest player! Type: 'stop' to stop."
          )

          const nearestEntity = bot.nearestEntity(({ type }) => type === 'player')
          if (!nearestEntity) {
            bot.chat(config.chatColors ? "&cERROR - &7I can't find the player!" : "ERROR - I can't find the player!")
            return
          }

          bot.pvp.attack(nearestEntity)
          console.log('Attacking nearest player.')
        };

        function me () {
          if (nowAttacking !== false) {
            bot.chat(config.chatColors ? '&cERROR &7- I am already attacking!' : 'ERROR - I am already attacking!')
            return
          }
          if (!target) {
            bot.chat(config.chatColors ? "&cERROR - &7I can't find the player!" : "ERROR - I can't find the player!")
            return
          }

          nowAttacking = true

          bot.chat(
            config.chatColors
              ? '&aI started attacking you! Type &cstop &ato stop.'
              : "I started attacking you! Type: 'stop' to stop."
          )

          bot.pvp.attack(target)
          console.log(`Attacking ${username}`)
        };

        function player () {
          if (nowAttacking !== false) {
            bot.chat(config.chatColors ? '&cERROR &7- I am already attacking!' : 'ERROR - I am already attacking!')
            return
          }

          const playerEntity = bot.players[args[1]] ? bot.players[args[1]].entity : null

          if (!playerEntity) {
            bot.chat(config.chatColors ? "&cERROR - &7I can't find the player!" : "ERROR - I can't find the player!")
            return
          }

          if (playerEntity.username === bot.username) {
            bot.chat(config.chatColors ? "&cERROR &7- I can't fight myself!" : "ERROR - I can't fight myself!")
            return
          }

          nowAttacking = true

          bot.chat(
            config.chatColors
              ? `&aI started attacking &7${playerEntity.username}&a! Type &cstop &ato stop.`
              : `I started attacking ${playerEntity.username}! Type: 'stop' to stop.`
          )

          bot.pvp.attack(playerEntity)
          console.log(`Attacking ${args[1]}`)
        };
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
        const args = message.split(' ')
        if (!args[1]) {
          bot.chat(
            config.chatColors
              ? '&cERROR &7- Invalid usage! Use &ainv &e<drop/equip/deposit> &7instead.'
              : "ERROR - Invalid usage! Use: 'inv <drop/equip/deposit>' instead."
          )
          return
        }

        if (args[1] !== 'drop' && args[1] !== 'equip' && args[1] !== 'deposit') {
          bot.chat(
            config.chatColors
              ? '&cERROR &7- Invalid usage! Use &ainv &e<drop/equip/deposit> &7instead.'
              : "ERROR - Invalid usage! Use: 'inv <drop/equip/deposit>' instead."
          )
          return
        }

        if (args[1] === 'drop' && !args[2]) {
          bot.chat(
            config.chatColors
              ? '&cERROR &7- Invalid usage! Use &ainv &adrop &e<all/name of item> &7instead.'
              : "ERROR - Invalid usage! Use: 'inv drop <all/name of item>' instead."
          )
          return
        }

        if (args[1] === 'equip' && !args[2]) {
          bot.chat(
            config.chatColors
              ? '&cERROR &7- Invalid usage! Use &ainv equip &e<item> &7instead.'
              : "ERROR - Invalid usage! Use: 'inv equip <item>' instead."
          )
          return
        }

        if (args[1] === 'drop') {
          if (args[2] === 'all') {
            const drop = () => {
              if (!bot.inventory.items()[0]) return
              bot.toss(bot.inventory.items()[0].type, null, 64, () => {
                drop()
              })
            }

            drop()
            bot.chat(config.chatColors ? '&aI tossed all of my items!' : 'I tossed all of my items!')
            console.log('I tossed all of my items.')
          } else {
            const itemType = mcData.itemsByName[args[2]]
            if (!itemType) {
              bot.chat(
                config.chatColors
                  ? `&cERROR &7- I don't know any items by name &a${args[2]}&7.`
                  : `ERROR - I don't know any items by name ${args[2]}.`
              )
              return
            }

            const dropItem = bot.inventory.items().find(item => item.name === args[2])
            if (!dropItem) {
              bot.chat(
                config.chatColors
                  ? `&cERROR &7- I don't have &a${args[2]}&7 in my inventory.`
                  : `ERROR - I don't have ${args[2]} in my inventory.`
              )
              return
            }

            bot.tossStack(dropItem)
            bot.chat(config.chatColors ? `&aI tossed &7${args[2]}&a!` : `I tossed ${args[2]}!`)
            console.log(`I tossed ${args[2]}`)
          }
        }

        if (args[1] === 'equip') {
          const itemType = mcData.itemsByName[args[2]]
          if (!itemType) {
            bot.chat(
              config.chatColors
                ? `&cERROR &7- I don't know any items by name &a${args[2]}&7.`
                : `ERROR - I don't know any items by name ${args[2]}.`
            )
            return
          }

          const dropItem = bot.inventory.items().find(item => item.name === args[2])
          if (!dropItem) {
            bot.chat(
              config.chatColors
                ? `&cERROR &7- I don't have &a${args[2]}&7 in my inventory.`
                : `ERROR - I don't have ${args[2]} in my inventory.`
            )
            return
          }

          bot.equip(dropItem)
          bot.chat(config.chatColors ? `&aI equipped &7${args[2]}&a!` : `I equipped ${args[2]}!`)
          console.log(`I equipped ${args[2]}`)
        }

        if (args[1] === 'deposit') {
          if (nowAction || nowAttacking) {
            bot.chat(
              config.chatColors
                ? '&cERROR &7- There is an ongoing action. Type &estop &7to stop the action.'
                : "ERROR - There is an ongoing action. Type: 'stop' to stop the action."
            )
            return
          }

          deposit()
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
        if (nowAttacking) {
          bot.chat(
            config.chatColors
              ? "&cERROR &7- You can't use this command while I am attacking!"
              : "ERROR - You can't use this command while I am doing attacking!"
          )
          return
        }

        const args = message.split(' ')
        if (args.length < 2) {
          bot.chat(
            config.chatColors
              ? '&cERROR &7- Invalid usage! Use &aaction &e<action> &7(List of actions: &ahelp&7).'
              : 'ERROR - Invalid usage! Use: action <action> (List of actions: help).'
          )
          return
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
          bot.chat(
            config.chatColors
              ? '&cERROR &7- Invalid usage! Use &aaction &e<action> &7(List of actions: &ahelp&7).'
              : 'ERROR - Invalid usage! Use: action <action> (List of actions: help).'
          )
          return
        }

        if (args[1] === 'fish') fish()
        if (args[1] === 'collect') collect()
        if (args[1] === 'harvest') harvest()
        if (args[1] === 'come') comeCMD()
        if (args[1] === 'tower') tower()
        if (args[1] === 'sleep') sleep()
        if (args[1] === 'follow') followCMD()

        function fish () {
          if (nowAction || nowAttacking) {
            bot.chat(
              config.chatColors
                ? '&cERROR &7- There is an ongoing action. Type &estop &7to stop the action.'
                : "ERROR - There is an ongoing action. Type: 'top' to stop the action."
            )
            return
          }

          if (!args[2]) {
            bot.chat(
              config.chatColors
                ? '&cERROR &7- Invalid usage! Use &afish &e<time>&7.'
                : "ERROR - Invalid usage! Use 'fish <time>'"
            )
            return
          }

          check = parseInt(args[2])
          if (!check || isNaN(check) || check < 1) {
            bot.chat(
              config.chatColors
                ? '&cERROR &7- Invalid usage! Use &afish &e<time>&7.'
                : "ERROR - Invalid usage! Use 'fish <time>'"
            )
            return
          }

          const water = bot.findBlocks({
            matching: mcData.blocksByName.water.id,
            maxDistance: 64,
            count: 1
          })

          if (!water) {
            bot.chat(config.chatColors ? "&cERROR &7- I can't find water!" : "ERROR - I can't find water!")
            return
          }

          fishingCheck1 = 1
          fishingCheck2 = 1
          nowAction = true

          const w = bot.blockAt(water[0])
          const v = bot.blockAt(w.position.offset(0, 1, 0))

          bot.pathfinder.setMovements(defaultMove)
          bot.pathfinder.setGoal(new GoalNear(w.position.x, w.position.y, w.position.z, 3))
          bot.chat(config.chatColors ? '&7Looking for water...' : 'Looking for water...')
          console.log('Fishing - Looking for water..')

          bot.once('goal_reached', () => {
            bot.lookAt(v.position, false)

            console.log('I started fishing.')
          })
        };

        function comeCMD () {
          if (nowAction || nowAttacking) {
            bot.chat(
              config.chatColors
                ? '&cERROR &7- There is an ongoing action. Type &estop &7to stop the action.'
                : "ERROR - There is an ongoing action. Type: 'stop' to stop the action."
            )
            return
          }

          if (!target) {
            bot.chat(config.chatColors ? "&cERROR &7- I don't see you!" : "ERROR - I don't see you!")
            return
          }

          bot.pathfinder.stop()
          const p = target.position
          bot.chat(config.chatColors ? '&aI am going to your position!' : 'I am going to your position!')
          bot.pathfinder.setMovements(defaultMove)
          bot.pathfinder.setGoal(new GoalNear(p.x, p.y, p.z, 1))
          console.log(`I am going to ${username}'s position.`)
        };

        function followCMD () {
          if (nowAction || nowAttacking) {
            bot.chat(
              config.chatColors
                ? '&cERROR &7- There is an ongoing action. Type &estop &7to stop the action.'
                : "ERROR - There is an ongoing action. Type: 'stop' to stop the action."
            )
            return
          }

          if (!target) {
            bot.chat(config.chatColors ? "&cERROR - &7I can't find you!" : "ERROR - I can't find you!")
            return
          }

          bot.chat(
            config.chatColors
              ? "&aI'll follow you from now on! To stop the process, type &estop&a."
              : "I'll follow you from now on! To stop the process, type 'stop'."
          )

          bot.pathfinder.stop()
          bot.pathfinder.setMovements(defaultMove)
          bot.pathfinder.setGoal(new GoalFollow(target, 1), true)
          console.log(`I am following ${username}`)
        };

        async function tower () {
          if (nowAction || nowAttacking) {
            bot.chat(
              config.chatColors
                ? '&cERROR &7- There is an ongoing action. Type &estop &7to stop the action.'
                : "ERROR - There is an ongoing action. Type: 'stop' to stop the action."
            )
            return
          }

          if (!args[2]) {
            bot.chat(
              config.chatColors
                ? '&cERROR &7- Invalid usage! Use &aaction tower &e<blocks>&7 instead.'
                : "ERROR - Invalid usage! Use 'action tower <blocks>' instead."
            )
            return
          }

          const x = parseInt(args[2])
          if (!x) {
            bot.chat(
              config.chatColors
                ? '&cERROR &7- Invalid usage! Use &aaction tower &e<blocks>&7 instead.'
                : "ERROR - Invalid usage! Use 'action tower <blocks>' instead."
            )
            return
          }

          if (x > 64) {
            bot.chat(
              config.chatColors
                ? '&cERROR &7- Maximum size of the tower can be &a64 &7blocks!'
                : 'ERROR - Maximum size of the tower can be 64 blocks!'
            )
            return
          }
          const towerItem = bot.inventory.items().find(item => item.name === config.towerBlock)
          if (!towerItem) {
            bot.chat(
              config.chatColors
                ? `&cERROR &7- I need &a${x} &e${config.towerBlock} &7and I only have &a0!`
                : `ERROR - I need ${x} ${config.towerBlock} and I only have 0!`
            )
            return
          }

          if (towerItem.count < x) {
            bot.chat(
              config.chatColors
                ? `&cERROR &7- I need &a${x} &e${config.towerBlock} &7and I only have &a${towerItem.count}!`
                : `ERROR - I need ${x} ${config.towerBlock} and I only have ${towerItem.count}!`
            )
            return
          }

          bot.chat(
            config.chatColors
              ? `&aI started building &e${x} &ablocks high tower!`
              : `I started building ${x} blocks high tower!`
          )

          console.log(`I started building ${x} blocks high tower.`)
          nowAction = true
          for (let i = 0; i < x; i++) {
            bot.equip(towerItem, 'hand')
            const towerBlock = bot.blockAt(bot.entity.position.offset(0, -1, 0))
            const jumpY = Math.floor(bot.entity.position.y) + 1.0
            bot.setControlState('jump', true)
            bot.on('move', placeIfHighEnough)
            let tryCount = 0

            function placeIfHighEnough () {
              if (bot.entity.position.y > jumpY) {
                bot.placeBlock(towerBlock, vec3(0, 1, 0), err => {
                  if (err) {
                    tryCount++
                    if (tryCount > 10) {
                      console.error(err.message)
                      bot.setControlState('jump', false)
                      bot.removeListener('move', placeIfHighEnough)
                      return
                    }
                    return
                  }
                  bot.setControlState('jump', false)
                  bot.removeListener('move', placeIfHighEnough)
                })
              }

              if (x - 1 === i) {
                nowAction = false
              }
            };

            await delay(600)
          }
        };

        function sleep () {
          if (nowAction || nowAttacking) {
            bot.chat(
              config.chatColors
                ? '&cERROR &7- There is an ongoing action. Type &estop &7to stop the action.'
                : "ERROR - There is an ongoing action. Type: 'stop' to stop the action."
            )
            return
          }

          const thunderstorm = bot.isRaining && bot.thunderState > 0
          if (thunderstorm || !(bot.time.timeOfDay >= 12541 && bot.time.timeOfDay <= 23458)) {
            bot.chat(
              config.chatColors
                ? '&cERROR &7- I can sleep only during night or thunderstorm!'
                : 'ERROR - I can sleep only during night or thunderstorm!'
            )
            return
          }

          const bed = bot.findBlocks({
            matching: blk => bot.isABed(blk),
            maxDistance: 64,
            count: 1
          })

          try {
            if (bed[0]) {
              const bedAt = bot.blockAt(bed[0])
              bot.pathfinder.setMovements(defaultMove)
              bot.pathfinder.setGoal(new GoalNear(bedAt.position.x, bedAt.position.y, bedAt.position.z, 1))
              bot.chat(config.chatColors ? '&aLooking for bed..' : 'Looking for bed..')
              console.log('SLEEP - Looking for bed...')

              bot.once('goal_reached', () => {
                goSleep()
              })

              const goSleep = async () => {
                bot.chat(config.chatColors ? '&aSleeping...' : 'Sleeping...')
                console.log('Sleeping..')

                await bot
                  .sleep(bedAt)
                  .catch(err => bot.chat(config.chatColors ? `&cERROR &7- ${err}` : `ERROR - ${err}`))
              }
            } else {
              bot.chat(config.chatColors ? "&cERROR &7- I don't see any bed!" : "ERROR - I don't see any bed!")
            }
          } catch (err) {
            console.log(err)
            bot.chat(
              config.chatColors
                ? '&cError occured while executing command, check console.'
                : 'Error occured while executing command, check console.'
            )
          }
        };

        async function harvest () {
          if (nowAction || nowAttacking) {
            bot.chat(
              config.chatColors
                ? '&cERROR &7- There is an ongoing action. Type &astop &7to stop the action.'
                : "ERROR - There is an ongoing action. Type: 'stop' to stop the action."
            )
            return
          }

          let crop = []
          if (!args[2] || !args[3]) {
            bot.chat(
              config.chatColors
                ? '&cERROR &7- Invalid usage! Use &aaction harvest &e<count> <carrot/potato/wheat> &7instead.'
                : "ERROR - Invalid usage! Use 'action harvest <count> <carrot/potato/wheat>' instead."
            )
            return
          }

          const checkCount = parseInt(args[2])

          if (isNaN(checkCount)) {
            bot.chat(
              config.chatColors
                ? '&cERROR &7- Invalid usage! Use &aaction harvest &e<count> <carrot/potato/wheat> &7instead.'
                : "ERROR - Invalid usage! Use 'action harvest <count> <carrot/potato/wheat>' instead."
            )
            return
          }

          if (args[3] !== 'carrot' && args[3] !== 'potato' && args[3] !== 'wheat') {
            bot.chat(
              config.chatColors
                ? '&cERROR &7- Invalid usage! Use &aaction harvest &e<count> <carrot/potato/wheat> &7instead.'
                : "ERROR - Invalid usage! Use 'action harvest <count> <carrot/potato/wheat>' instead."
            )
            return
          }

          if (args[3] === 'carrot') crop = ['carrots', 'carrot']
          if (args[3] === 'potato') crop = ['potatoes', 'potato']
          if (args[3] === 'wheat') crop = ['wheat', 'wheat_seeds']

          nowAction = true
          const harvestBlock = bot.findBlocks({
            matching: block => block.name === crop[0] && block.metadata === 7,
            count: checkCount,
            maxDistance: 64
          })

          if (harvestBlock[0]) {
            bot.chat(
              config.chatColors
                ? `&aI found &c${harvestBlock.length} &e${crop[0]}&a!`
                : `I found ${harvestBlock.length} ${crop[0]}!`
            )
            console.log(`Harvesting ${harvestBlock.length} ${crop[0]}`)

            for (let i = 0; i < harvestBlock.length; i++) {
              if (nowAction === false) return

              const h = bot.blockAt(harvestBlock[i])
              const { x, y, z } = h.position
              const goal = new GoalBreakBlock(x, y, z, bot)
              const collect = new GoalBlock(x, y, z)
              const harvestMove = new Movements(bot, mcData)
              harvestMove.allowParkour = false
              harvestMove.blocksToAvoid.add(mcData.blocksByName.water.id)
              harvestMove.blocksToAvoid.delete(mcData.blocksByName.wheat.id)
              harvestMove.blocksCantBreak.delete(mcData.blocksByName.wheat.id)
              bot.pathfinder.setMovements(harvestMove)
              // eslint-disable-next-line no-empty-function
              await bot.pathfinder.goto(goal).catch(() => {})
              await bot.lookAt(h.position)
              await breakCrop()
              // eslint-disable-next-line no-empty-function
              await bot.pathfinder.goto(collect).catch(() => {})

              async function breakCrop () {
                await bot.dig(h).catch(err => {
                  bot.chat(config.chatColors ? `&cERROR &7- ${err}` : `ERROR - ${err}`)
                })

                const seed = bot.inventory.items().find(item => item.name === crop[1])
                await delay(1000)
                if (seed) await bot.equip(seed, 'hand')
                else return

                const farmBlock = bot.blockAt(h.position.offset(0, -1, 0))
                await delay(500)
                await bot.placeBlock(farmBlock, vec3(0, 1, 0)).catch(err => {
                  bot.chat(config.chatColors ? `&cERROR &7- ${err}` : `ERROR - ${err}`)
                })
              };

              if (harvestBlock.length - 1 === i) {
                bot.chat(config.chatColors ? '&aHarvesting finished!' : 'Harvesting finished!')
                console.log('Harvesting finished.')
                nowAction = false
                if (config.depositItems) await deposit()
              }
            }
          } else {
            bot.chat(config.chatColors ? `&cERROR &7- No ${crop[0]} found!` : `ERROR - No ${crop[0]} found!`)
          }
        };

        async function collect () {
          let countMine
          if (nowAction || nowAttacking) {
            bot.chat(
              config.chatColors
                ? '&cERROR &7- There is an ongoing action. Type &estop &7to stop the action.'
                : "ERROR - There is an ongoing action. Type: 'stop' to stop the action."
            )
            return
          }

          if (args.length === 4) {
            countMine = parseInt(args[2])
          } else if (args.length === 3) {
            countMine = config.mineBlocksUndefined
          }

          let type = args[2]
          if (args.length === 4) type = args[3]
          if (type === 'water' || type === 'air' || type === 'bedrock' || type === 'barrier') {
            bot.chatbot.chat(
              config.chatColors ? '&cERROR &7- This block is blacklisted.' : 'ERROR - This block is blacklisted.'
            )
            return
          }

          const blockType = mcData.blocksByName[type]

          if (!blockType) {
            bot.chat(
              config.chatColors
                ? `&cERROR &7- I don't know any blocks by name &a${type}&7.`
                : `ERROR - I don't know any blocks by name ${type}.`
            )
            return
          }

          const blocks = bot.findBlocks({
            matching: blockType.id,
            maxDistance: 64,
            count: countMine
          })

          if (blocks.length === 0) {
            bot.chat(config.chatColors ? "&cERROR &7- I don't see this block." : "ERROR - I don't see this block.")
            return
          }

          nowAction = true
          bot.chat(
            config.chatColors
              ? `&aI started collecting &e${blocks.length} &c${type}&a!`
              : `I started collecting ${blocks.length} ${type}!`
          )
          console.log(`I started collecting ${blocks.length} ${type}.`)

          for (let i = 0; i < Math.min(blocks.length, countMine); i++) {
            if (nowAction === false) return
            nowBlock = bot.findBlocks({
              matching: blockType.id,
              maxDistance: 64,
              count: 1
            })
            if (nowBlock.length === 0) {
              bot.chat(config.chatColors ? "&cERROR &7- I don't see this block." : "ERROR - I don't see this block.")
              return
            }

            const m = bot.blockAt(nowBlock[0])
            const { x, y, z } = m.position
            const goal = new GoalBreakBlock(x, y, z, bot)
            const collectBlock = new GoalBlock(x, y, z)
            bot.pathfinder.setMovements(defaultMove)
            // eslint-disable-next-line no-empty-function
            await bot.pathfinder.goto(goal).catch(() => {})
            const tool = bot.pathfinder.bestHarvestTool(m)
            if (tool !== undefined && tool !== null) bot.equip(tool, 'hand')
            await bot.lookAt(m.position)
            // eslint-disable-next-line no-empty-function
            await bot.dig(m).catch(() => {})
            // eslint-disable-next-line no-empty-function
            await bot.pathfinder.goto(collectBlock).catch(() => {})

            if (Math.min(blocks.length, countMine) - 1 === i) {
              bot.chat(config.chatColors ? '&aCollecting complete!' : 'Collecting complete!')
              console.log('Collecting complete.')
              nowAction = false
              if (config.depositItems) deposit()
            }
          }
        };
      }
    })

    const deposit = () => {
      const chests = bot.findBlocks({
        matching: mcData.blocksByName.chest.id,
        maxDistance: 64,
        count: 1
      })

      if (!chests[0]) {
        bot.chat(config.chatColors ? "&cERROR &7- I don't see any chest!" : "ERROR - I don't see any chest!")
        return
      }

      const ch = bot.blockAt(chests[0])
      bot.pathfinder.setMovements(defaultMove)
      bot.pathfinder.setGoal(new GoalNear(ch.position.x, ch.position.y, ch.position.z, 3))
      bot.chat(config.chatColors ? '&7Looking for chest...' : 'Looking for chest...')
      console.log('Looking for chest..')

      bot.once('goal_reached', () => {
        bot.lookAt(ch.position, false)
        depositItems()
      })

      const depositItems = async () => {
        const chest = await bot.openChest(ch)
        for (const slot of bot.inventory.slots) {
          if (slot) {
            await chest.deposit(slot.type, null, slot.count)
          }
        }
        chest.close()
      }
    }

    bot.on('goal_reached', () => {
      if (fishingCheck2 === 1) {
        fishingOnce()
        setTimeout(() => {
          nowAction = false
        }, check * 1000)
        fishingCheck2 = 0
      }
    })

    bot.on('death', () => {
      bot.stopDigging()
      nowAction = false
      nowAttacking = false
    })

    bot.on('playerCollect', (collector, collected) => {
      if (collector.type === 'player' && collected.type === 'object' && collector.username === bot.username) {
        if (nowAction === false && fishingCheck1) {
          const rawItem = collected.metadata[8]
          const id = rawItem.itemId
          const itemName = mcData.findItemOrBlockById(id).displayName

          bot.chat(config.chatColors ? `&6FISHING &7- I caught &a${itemName}&7!` : `FISHING - I caught ${itemName}!`)
          console.log(`FISHING - I caught ${itemName}!`)
          bot.chat(
            config.chatColors
              ? '&6FISHING &7- &aI successfully finished fishing.'
              : 'FISHING - I successfully finished fishing.'
          )
          console.log('Successfully finished fishing.')
          fishingCheck1 = false
          if (config.depositItems) deposit()
        } else if (nowAction && fishingCheck1) {
          const rawItem = collected.metadata[8]
          const id = rawItem.itemId
          const itemName = mcData.findItemOrBlockById(id).displayName
          bot.chat(config.chatColors ? `&6FISHING &7- I caught &a${itemName}&7!` : `FISHING - I caught ${itemName}!`)
          console.log(`FISHING - I caught ${itemName}!`)
          fishing()
        }
      }
    })

    const fishingOnce = async () => {
      const fishRod = bot.inventory.items().find(item => item.name.includes('fishing'))

      if (fishRod) {
        bot.equip(fishRod, 'hand')
        await delay(2000)
        bot.chat(config.chatColors ? `&7I will fish for &a${check}&7 seconds.` : `I will fish for ${check} seconds.`)
        try {
          await bot.fish()
        } catch (err) {
          bot.chat(config.chatColors ? `&cERROR &7- ${err.message}` : `ERROR - ${err.message}`)
        }
      } else if (!fishRod) {
        nowAction = false
        fishingCheck1 = 0
        bot.chat(config.chatColors ? "&cERROR &7- I don't have a fishing rod!" : "ERROR - I don't have a fishing rod!")
      }
    }

    const fishing = async () => {
      const fishRod = bot.inventory.items().find(item => item.name.includes('fishing'))
      if (fishRod) {
        bot.equip(fishRod, 'hand')
        try {
          await bot.fish()
        } catch (err) {
          bot.chat(config.chatColors ? `&cERROR &7- ${err.message}` : `ERROR - ${err.message}`)
        }
      } else if (!fishRod) {
        nowAction = false
        fishingCheck1 = 0
        bot.chat(config.chatColors ? "&cERROR &7- I don't have a fishing rod!" : "ERROR - I don't have a fishing rod!")
      }
    }
  })
}

system()
