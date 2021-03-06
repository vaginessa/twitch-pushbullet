/* jshint esversion: 6 */

const flash = require('../util/flash.js');
const logger = require('../util/logger.js');
const twitchApi = require('../services/twitchApi.js');
const express = require('express');
const router = express.Router();

const config = require('../config.js');

var oauth;

/* GET home page. */
router.get('/twitchAuthResult', function(req, res, next) {
	const state = req.query.state;
	if (req.session.stateToken !== state) {
		logger.warn('state token not valid: %s != %s', req.session.stateToken, state);
		flash.set(req, 'Possible hacking attempt - twitch authentication failed.');
		res.redirect(config.app.basePath + '/');
		return;
	}
	const authCode = req.query.code;
	oauth.getAccessToken(authCode, state, (err, accessToken) => {
		if (err) {
			logger.error('access token fetch failed', err);
			flash.set(req, err.message);
			res.redirect(config.app.basePath + '/');
			return;
		}
		twitchApi.getUser(accessToken, (err, user) => {
			if (err) {
				logger.error('get user info failed', err);
				flash.set(req, err.message);
				res.redirect(config.app.basePath + '/');
				return;
			}
			req.session.user = {
				email: user.email,
				twitch_user_id: user._id,
				twitch_name: user.name,
				twitch_token: accessToken
			};
			twitchApi.getFollowedChannels(user._id, (err, follows) => {
				if (err) {
					logger.error('get followed channels failed', err);
					flash.set(req, err.message);
					res.redirect(config.app.basePath + '/');
					return;
				}
				req.session.twitchFollows = follows;
				res.redirect(config.app.basePath + '/pushbulletAuth');
			});
		});
	});
});

module.exports = router;

module.exports.setOAuthClient = function(value) {
	oauth = value;
};
