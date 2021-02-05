const { Markup } = require('telegraf');

function getMarkupButtons(buttons, columns = false) {
    if (columns === true) {
        columns = 1;
    }

    let markupButtons = buttons.map(button => {
        if (button.url) {
            return Markup.button.url(button.text, button.url);
        }
        else {
            return Markup.button.callback(button.text, button.code);
        }
    });

    let columnButtons = [];
    if (columns > 0) {
        let row = [];
        for (const button of markupButtons) {

            if (row.length === columns) {
                columnButtons.push(row);
                row = [];
            }

            row.push(button);
        }

        if (row.length > 0) {
            columnButtons.push(row);
        }
    }
    else {
        columnButtons = markupButtons;
    }

    return columnButtons;
}

module.exports = {
    wait(msec) {
        return new Promise(resolve => setTimeout(resolve, msec));
    },
    eventLoopQueue() {
        return new Promise(resolve =>
            setImmediate(resolve)
        );
    },
    isStartCommand(ctx) {
        return ctx.update && ctx.update.message && ctx.update.message.text && ctx.update.message.text.toLowerCase().indexOf('/start') === 0;
    },
    clone(obj) {
        return JSON.parse( JSON.stringify(obj) );
    },
    menu(buttons, columns = false, oneTime = false) {
        let columnButtons = getMarkupButtons(buttons, columns);
        let keyboard = Markup.inlineKeyboard(columnButtons);

        if (oneTime) {
            keyboard = keyboard.oneTime(true);
        }

        return keyboard;
    }
}