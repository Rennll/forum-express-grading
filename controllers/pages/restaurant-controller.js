const { Restaurant, Category, User, Comment } = require('../../models')
const restaurantServices = require('../../services/restaurant-services')

const restaurantController = {
  getRestaurants: (req, res, next) => {
    restaurantServices.getRestaurants(req, (err, data) => err ? next(err) : res.render('restaurants', data))
  },
  getFeeds: (req, res, next) => {
    const RESTAURANT_LIMIT = 10
    const COMMIT_LIMIT = 15

    return Promise.all([
      Restaurant.findAll({
        limit: RESTAURANT_LIMIT,
        order: [['createdAt', 'DESC']],
        include: [Category],
        raw: true,
        nest: true
      }),
      Comment.findAll({
        limit: COMMIT_LIMIT,
        order: [['createdAt', 'DESC']],
        include: [Restaurant, User],
        raw: true,
        nest: true
      })
    ])
      .then(([restaurants, comments]) => res.render('feeds', { restaurants, comments }))
      .catch(err => next(err))
  },
  getRestaurant: (req, res, next) => {
    return Restaurant.findByPk(req.params.id, {
      include: [
        Category,
        { model: Comment, include: User },
        { model: User, as: 'FavoritedUsers' },
        { model: User, as: 'LikedUsers' }
      ],
      order: [
        [{ model: Comment }, 'createdAt', 'DESC']
      ]
    })
      .then(restaurant => {
        if (!restaurant) throw new Error("Restaurant didn't exist!") //  如果找不到，回傳錯誤訊息，後面不執行

        return restaurant.increment('viewCounts', { by: 1 })
      })
      .then(restaurant => {
        const isFavorited = restaurant.FavoritedUsers.some(f => f.id === req.user.id)
        const isLiked = restaurant.LikedUsers.some(l => l.id === req.user.id)

        res.render('restaurant', { restaurant: restaurant.toJSON(), isFavorited, isLiked })
      })
      .catch(err => next(err))
  },
  getDashboard: (req, res, next) => {
    return Restaurant.findByPk(req.params.id, {
      include: [
        Category,
        { model: Comment },
        { model: User, as: 'FavoritedUsers' }
      ]
    })
      .then(restaurant => {
        if (!restaurant) throw new Error("Restaurant didn't exist!") //  如果找不到，回傳錯誤訊息，後面不執行
        const result = restaurant.toJSON()
        result.commentCount = result.Comments?.length
        result.favoritedCount = result.FavoritedUsers?.length

        return res.render('dashboard', { restaurant: result })
      })
      .catch(err => next(err))
  },
  getTopRestaurants: (req, res, next) => {
    const RESTAURANT_LIMIT = 10

    return Restaurant.findAll({
      include: [
        { model: User, as: 'FavoritedUsers' }
      ]
    })
      .then(restaurants => {
        const result = restaurants
          .map(r => ({
            ...r.toJSON(),
            favoritedCount: r.FavoritedUsers.length,
            isFavorited: req.user?.FavoritedRestaurants.some(fr => fr.id === r.id)
          }))
          .sort((a, b) => b.favoritedCount - a.favoritedCount)
          .splice(0, RESTAURANT_LIMIT - 1)

        res.render('top-restaurants', { restaurants: result })
      })
  }
}

module.exports = restaurantController
