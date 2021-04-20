const axios = require("axios");
const BOT_HTTP_INTERFACE_URL = process.env.BOT_HTTP_INTERFACE_URL || 'http://bot:3000';

module.exports = {
    async syncRunningBots() {
        let result = null;

        try {
            let {data} = await axios.get(BOT_HTTP_INTERFACE_URL + '/sync');
            result = data;
        }
        catch (e) {
            result = {error: e};
        }

        return result;
    },

    async restartBot(bot) {
        let result = null;

        try {
            let {data} = await axios.post(BOT_HTTP_INTERFACE_URL + '/restartBot', {bot});
            result = data;
        }
        catch (e) {
            result = {error: e};
        }

        return result;
    }
}