

![Logo](https://i.ibb.co/hmLHrzV/2022-01-07-0mc-Kleki.png)

# ❓What is JUMBO?

JUMBO (**J**ust a **U**niversal **M**ineflayer **B**ot - **O**pensourced) is a Minecraft robot made using [Mineflayer](https://github.com/PrismarineJS/Mineflayer) package and its addons. Supports MC version **1.17.1**. You need to have [Node.js](https://nodejs.org) installed to run the bot.


## 🎈 Features

- Custom mining, fishing and farming system.
- Multiple bots support - You can spawn them with command!
- Can attack players.
- 14 config options, including chatcolors!
- Can deposit items into chests.
- ...and more coming soon!


## 🧰 Installation

- You need to have [Node.js](https://nodejs.org) (recommended version: v14) installed to run the bot.
- Download the newest zip file from Versions tab and extract.
- Run `installation.bat` file.
- Setup IP address, port, name.. in `config.json` file.
- Run the bot using `run_bot.bat` file!

## 🎈 Configuration

- **name:** Name of the bot ingame.
- **nameMinions:** Name of minion bots ingame.
- **host, port, version:** Server info.
- **myLeader:** Person that can use **tp** and **kill** commands.
- **joinMessage:** Join message of minion bots. You can customize main bot join message in index.js.
- **depositItems:** If the bot should deposit items into chest after mining/fishing/farming.
- **chatColors:** If the bot should use chat formatting in chat. You need plugin for this, but it is fancy!
- **authmePassword:** Password which bot will use to type /login and /register.
- **startDelayInMS:** Start delay between minions. I recommend to set this atleast to 5000ms.
- **towerBlock:** Which block should bot use to build towers.
- **mineBlocksIfUndefined:** How much blocks should bot collect, if it isn't said in command.
    
## 🤖 Commands

Commands are split into 4 modules.

#### Random commands (no module):

- **help** - Link to this github page.
- **kill** - Kills the bot using /kill command. Bot must have OP and only bot leader can use this command.
- **tp** - Bot teleports to you. Bot must have OP and only bot leader can use this command.
- **spawn -num-** - Spawns minions - new bots, that have seperate code from main bot.
- **stop** - Stops all actions.

#### Multiple bots commands:

- **army** - All bots except main bot start attacking you.
- **random** - All bots except main bot start moving in random direction.
- **leave** - All bots except main bot leave the server.

#### Attack module:

- **attack me** - Bot starts attacking you.
- **attack nearest** - Bot starts attacking nearest player.
- **attack -playername-** - Bot starts attacking provided player.

#### Inventory module:

- **inv drop -all/name of item-** - Bot drops provided item / all items.
- **inv equip -name of item-** - Bot equips provided item in hand.
- **inv deposit** - Bot deposits all items into nearest chest.   

#### Action module:

- **action come** - Bot comes to your position. 
- **action follow** - Bot starts following you.    
- **action tower -num-** - Bot starts building tower.    
- **action fish -seconds-** - Bot starts fishing for provided time.    
- **action harvest -num- -potato/carrot/wheat-** - Bot starts farming.    
- **action collect -num- -blockname-** - Bot starts mining blocks.    
- **action sleep** - Bot finds the nearest bed and sleeps.
    


## 🎦 Screenshots
![Fishing](https://s10.gifyu.com/images/ezgif-7-a1ba4e9635.gif)


## 🗺️ Roadmap

- Update Checker
- System to guard an area.
- Kit system that is seen on anarchy servers.
- Command to toggle some config features.
- Add new attacking option: Shooting with bow.
- New config options: Main Bed Position & Main Chest position.


## 📍 Issues, PRs and contant

- You can contact me on my [Discord Server](https://dsc.gg/hedgieserver) or add me as friend (**'h#1420**)
- Credits to AM - Help with coding and testing, thanks :)
- This is my first github project, so expect lots of bugs. Please be nice.
- If you want to report issue, you are welcome!
- Thanks for downloading the bot :D


