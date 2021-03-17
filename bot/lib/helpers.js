const he = require('he');
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
    },
    escapeHTML(html, decode = false) {
        if (!html) {
            return '';
        }

        if (decode) {
            html = he.decode(html);
        }

        let hasTags = (/\<([^ \/>]*) *[^>]*>/gi).test(html);
        let tags = hasTags ? html.match(/\<([^ \/>]*) *[^>]*>/gi).map(parsedTag => {
            let tagData = parsedTag.match(/<\/?([^ >]+)[^>]*>/i);
            if (tagData) {
                let tagName = tagData[1];
                if (tagName) {
                    return tagName.toLowerCase();
                }
            }
            return null;
        }).filter(tag => tag !== null).filter((tag, index, allTags) => allTags.indexOf(tag) === index) : [];

        let replaceTags = [{from: 'em', to: 'i'}, {from: 'strong', to: 'b'}];
        replaceTags.map(replaceData => {
            html = html.replace( new RegExp('<(\/?)'+replaceData.from+'( *[^>]*)>', 'g'), '<$1'+replaceData.to+'$2>' );
        });

        html = html.replace(/<li> *<\/li>/g, '');
        html = html.replace(/<\/p> *<\/li>/gi, '\n');
        html = html.replace(/<br> *<\/p>/gi, '\n');
        html = html.replace(/<\/p>/gi, '\n');
        html = html.replace(/<br> *<\/div>/gi, '\n');
        html = html.replace(/<br>/gi, '\n');
        html = html.replace(/<\/div>/gi, '\n');
        html = html.replace(/<li>/gi, '• ');
        html = html.replace(/<\/li>/gi, '\n');
        html = html.replace(/<\/ul>/gi, '\n');

        let allowedTags = ['b', 'strong', 'em', 'i', 'u', 'ins', 's', 'strike', 'del', 'a', 'code', 'pre'];
        let removeTags = tags.filter(value => !allowedTags.includes(value));
        removeTags.map(tag => {
            html = html.replace( new RegExp('<\/?'+tag+'[^>]*>', 'g'), '');
        });

        html = html.replace(/<(\s)/g, '&lt;$1');
        html = html.replace(/^ +/gm, '');
        html = html.replace(/\n{2,}/g, '\n\n');

        return html;
    }
}