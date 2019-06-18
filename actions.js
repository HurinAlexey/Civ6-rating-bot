const User = require('./models/User')
const ranks = require('./data/rank.json')

module.exports.getUserById = async (id) => {
    try {
        return await User.findOne({discordId: id})
    } catch (e) {
        console.log(e)
    }
}


module.exports.userStats = async (author, mention) => {
    try {
        const candidate = mention ||  author
        const user = await User.findOne({discordId: candidate.id})

        if (!user) throw new Error(`Пользователь <@${candidate.id}> не зарегестрирован!`)

        getRatingPosition(user.discordId).then(position => {
            author.createDM().then((dm) => {     
                dm.send(`
Пользователь: ${user.name}
Рейтинг: ${user.ratingScore}
Ранг: ${user.rank}
Позиция в рейтинге: ${position}
                `)
            })
        })
    } catch(e) {
       console.log(e)

       author.createDM().then((dm) => {
            dm.send(e.message)
        })
    }
}


module.exports.registerUser = async (candidate, channel, guild) => {
    const user = new User({
        name: candidate.username,
        discordId: candidate.id
    })

    try {
        await user.save()
        const message = `${user.name} успешно зарегистрировался!`
        console.log(message)
        channel.send(message)

        const guildMember = guild.member(candidate)
        const guildRoles = guild.roles
        const newRole = ranks['5']
        
        changeRole(guildMember, newRole, guildRoles)
    } catch(e) {
        if (e.code === 11000) {
            channel.send(`Пользователь ${user.name} уже существует!`)
        } else {
            console.log(e)
            channel.send(`Не удалось зерегистрировать пользователя ${user.name}!`)
        }
    }
}


module.exports.changeScore = async (mention, id, score, guild) => {
    try {
        const user = await User.findOne({discordId: id})
        const newScore = (user.ratingScore + score) > 0 ? (user.ratingScore + score) : 0
        const prevRank = calculateRank(user.ratingScore)
        const currentRank = calculateRank(newScore)
        
        await user.update({ratingScore: newScore, rank: currentRank})

        getRatingPosition(user.discordId).then(position => {
            mention.createDM().then((dm) => {
                dm.send(`
Ваш рейтинг изменился на ${score}
Ваш рейтинг ${newScore}
Позиция в рейтенге: ${position}
                `)
            }).catch(e => {
                console.log(e)
            })
        })

        if (prevRank !== currentRank) {
            const guildMember = guild.member(mention)
            const guildRoles = guild.roles
            const newRole = ranks[currentRank + '']

            changeRole(guildMember, newRole, guildRoles)
            mention.createDM().then((dm) => {
                dm.send(`
                    Ваш новый ранг: ${newRole}
                `)
            }).catch(e => {
                console.log(e)
            })
        }
    } catch(e) {
        console.log(e)
    }
}


module.exports.getAverageRank = async (usersId) => {
    try {
        let ranksList = []

        for (let id of usersId) {
            let user = await User.findOne({discordId: id})
            if (!user) {
                const ErrorUserNotFound = new Error(`Пользователь <@${id}> не зарегестрирован!`)
                return {error: ErrorUserNotFound}
            }
            ranksList.push(user.rank)
        }
        
        return Math.round(ranksList.reduce((total, current) => {
            return total + current
        }, 0) / ranksList.length)
    } catch (e) {
        console.log(e)
    }
}


module.exports.hasScorePermission = ({author, guild}) => {
    let authorRoles = []
    let authorPermission = false

    guild.member(author).roles.forEach((value) => {
      authorRoles.push(value.name)
    })

    if (
        authorRoles.indexOf('Администратор') !== -1 || 
        authorRoles.indexOf('Модератор') !== -1 || 
        authorRoles.indexOf('Казначей') !== -1
      ) {
        authorPermission = true
    }

    return authorPermission
}


module.exports.getTopUsers = async (count) => {
    const users = await User.find({}).sort({ratingScore: -1})
    const quantity = count <= users.length ? count : users.length
    return users.slice(0, quantity)
}


changeRole = (guildMember, role, guildRoles) => {
    let ranksList = []

    Object.keys(ranks).map(item => {
        ranksList.push(ranks[item])
    })

    let ranksToRemove = ranksList.filter(item => {
        return item !== role
    })

    guildRoles.forEach((value, key) => {
        if (value.name == role) {
            guildMember.addRole(key)
        } else if (ranksToRemove.indexOf(value.name) !== -1) {
            guildMember.removeRole(key)
        }
      }) 
}

calculateRank = (score) => {
    if (score < 2500) {
        return 5
    } else if (score < 5000) {
        return 4
    } else if (score < 7500) {
        return 3
    } else if (score < 10000) {
        return 2
    } else {
        return 1
    }
}


getRatingPosition = async (id) => {
    const users = await User.find({}).sort({ratingScore: -1})
    let position
    users.map((item, index) => {
        if (item.discordId === id) position = index + 1
    })
    return position
}
