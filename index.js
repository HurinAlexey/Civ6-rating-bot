const Discord = require('discord.js')
const mongoose = require('mongoose')
const client = new Discord.Client()

const actions = require('./actions')
const multiplier = require('./data/multiplier.json')
const modifiers = require('./data/modifiers.json')


mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true})

client.on('ready', () => {
  console.log('I am ready!')
})

client.on('message', message => {

  // Register
  if (message.content.startsWith('!register')) {
    const mention = message.mentions.users.first()
    const author = message.author
    const user = mention || author

    actions.registerUser(user, message.channel, message.guild)
    message.delete()
  }

  // Stats
  if (message.content.startsWith('!stats')) {
    const mention = message.mentions.users.first()
    actions.userStats(message.author, mention)
    message.delete()
  }

  // Score
  if (message.content.startsWith('!score')) {
    try {
      if (!actions.hasScorePermission(message)) throw new Error(`У <@${message.author.id}> нет доступа на изменение очков!`)

      const users = message.mentions.users
      const score = +message.content.split(' ')[1]
      const guild = message.guild
  
      users.forEach((value, key) => {
        actions.getUserById(key).then(user => {
          if (user) {
            actions.changeScore(value, key, score, guild)
          } else {
            message.channel.send(`Пользователь ${value.username} не зарегестрирован!`)
          }
        })      
      })   
    } catch (e) {
      console.log(e.message)
      message.channel.send(e.message)
    }
    
    message.delete()
  }

  // Set role
  // if (message.content.startsWith('!setrole')) {
  //   const user = message.guild.member(message.mentions.users.first())
  //   const role = message.content.split(' ')[1]
  //   const guildRoles = message.guild.roles
    
  //   actions.changeRole(user, role, guildRoles)   
    
  //   message.delete()
  // }

  // End game
  if (message.content.startsWith('!endgame')) {
    
    try {
      if (!actions.hasScorePermission(message)) throw new Error(`У <@${message.author.id}> нет доступа на изменение очков!`)

      const guild = message.guild
      const users = message.content.match(/<@\d+>/g)
      const foundedModifier = message.content.match(/\(\w+\)/g)
      let modifier

      if (foundedModifier) {
        modifier = foundedModifier[0].substr(1, foundedModifier[0].length - 2)
      } else {
        throw new Error('Не указан модификатор победы!')
      }

      if (users.length >= 4 && users.length <= 12) {

        const usersId = users.map(item => {
          return item.substr(2, item.length -3)
        })

        actions.getAverageRank(usersId, message.channel).then(rank => {

          if (rank.error) throw rank.error
          
          usersId.map((item, index) => {
            const position = index + 1
      
            actions.getUserById(item).then(user => {
              let penalty = 1
              let bonus = 0

              if (modifier === 'cc' && position !== 1) {
                penalty = score > 0 ? 0.75 : 1.25
              }

              if (modifier === 'scrap' && position !== 1) {
                penalty = 0.5
              }

              if (modifiers[modifier] && position === 1) {
                bonus = +modifiers[modifier]
              }

              let score = (+multiplier[`ffa-${users.length}`][`rank-${rank}`][`position-${position}`] + bonus) * 200 * penalty
    
              actions.changeScore(message.mentions.users.get(item), item, score, guild)
            }).catch(e => {
              console.log(e)
            })

          }) 
        }).catch(e => {
          console.log(e)
          message.channel.send(e.message)
        })

      } else {
        message.channel.send('Неверное количество игроков!')
      }

    } catch (e) {
      console.log(e.message)
      message.channel.send(e.message)
    }
    
    
    // message.delete()
  }

  if (message.content.startsWith('!top')) {
    const count = +message.content.split(' ')[1] || 20
    const foundedModifier = message.content.match(/\(\w+\)/g)
    let modifier
    
    if (foundedModifier) {
        modifier = foundedModifier[0].substr(1, foundedModifier[0].length - 2)
    }

    actions.getTopUsers(count).then(users => {
      let ratingTable = ''
      
      users.map((item, index) => {
        ratingTable += `**${index + 1}.** <@${item.discordId}>\t "${item.rank}"\t ${item.ratingScore}\n`
      })

      if (modifier === 'channel') {
        message.channel.send(ratingTable)
      } else {
        message.author.createDM().then((dm) => {
          dm.send(ratingTable)
        })
      }
      
    })

    message.delete()
  }
})

client.login(process.env.BOT_TOKEN)
