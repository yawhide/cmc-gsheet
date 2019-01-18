const _ = require('lodash')
const express = require('express')
const app = express()
const request = require('request')
const PORT = process.env.PORT || 5000

const cache = {}
const coinSymbolToIdMapping = {}

function cacheCoinList(cb) {
  request({
    json: true,
    method: 'GET',
    timeout: 1000 * 30,
    url: `https://api.coingecko.com/api/v3/coins/list`,
  }, (err, resp, body) => {
    if (err || resp.statusCode >= 400) {
      console.error('Failed to get coingecko coin info.', err, body, new Date())
      return cb(err || body)
    }
    body.forEach((coin) => {
      coinSymbolToIdMapping[coin.symbol] = coin.id
    })
    console.log('successfully cached coin list')
    cb()
  })
}

function cacheCoinInfo(symbol, cb) {
  if (!coinSymbolToIdMapping[symbol]) return cb('404')
  request({
    json: true,
    method: 'GET',
    timeout: 1000 * 30,
    url: `https://api.coingecko.com/api/v3/coins/${coinSymbolToIdMapping[symbol]}`,
  }, (err, resp, body) => {
    if (err || resp.statusCode >= 400) {
      console.error('Failed to get coingecko coin info.', err, body, new Date())
      return cb(err || body)
    }
    cache[symbol] = { price: body.market_data.current_price.usd, lastUpdateTime: new Date() }
    console.log(`successfully cached symbol: ${symbol}, price: ${body.market_data.current_price.usd}`)
    cb()
  })
}

app.get('/:symbol', (req, res) => {
  const symbol = req.params.symbol.toLowerCase()
  function finish() {
    res.json(cache[symbol].price)
  }
  if (cache[symbol] && new Date() - cache[symbol].lastUpdateTime < 1000 * 60 * 10) {
    return finish()
  } else if (_.isEmpty(cache)) {
    return cacheCoinList((err) => {
      if (err) return res.status(500).json(err)
      cacheCoinInfo(symbol, (err) => {
        if (err) return res.status(500).json(err)
        finish()
      })
    })
  }
  cacheCoinInfo(symbol, (err) => {
    if (err) return res.status(500).json(err)
    finish()
  })
})

app.listen(PORT, () => console.log(`Example app started on port: ${PORT}!`))
