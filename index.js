const _ = require('lodash')
const express = require('express')
const app = express()
const request = require('request')
const PORT = process.env.PORT || 5000

let cache = {};
let lastUpdateTime;

function updateCache(cb) {
  request({
    json: true,
    qs: {
      convert: 'CAD',
      limit: 0,
    },
    method: 'GET',
    timeout: 1000 * 30,
    url: 'https://api.coinmarketcap.com/v1/ticker',
  }, (err, resp, body) => {
    if (err || resp.statusCode >= 400) {
      console.error('Failed to get cmc update.', err, body, new Date())
      return res.status(500).json(err || body)
    }
    body.forEach(info => cache[info.symbol.toUpperCase()] = info)
    lastUpdateTime = new Date()
    // console.log('prices updated', lastUpdateTime)
    cb && cb()
  })
}

updateCache(() => setInterval(updateCache, 1000 * 60))

app.get('/:symbol', (req, res) => {
  const price = _.get(cache, [req.params.symbol.toUpperCase(), 'price_cad'], 0)
  res.json(Number(price))
})

app.listen(PORT, () => console.log('Example app started!'))
