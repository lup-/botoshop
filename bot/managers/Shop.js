const {getDb} = require('../lib/database');
const moment = require('moment');
const fs = require('fs');

const FILES_DIR = process.env.FILES_DIR;

module.exports = class Shop {
    constructor(shop) {
        this.shop = shop;
        this.products = [];
        this.categories = [];
    }

    async init() {
        await this.loadProducts();
        await this.loadCategories();
    }

    getId() {
        return this.shop ? this.shop.id : null;
    }

    async loadProducts() {
        let db = await getDb();
        this.products = await db.collection('products').find({shopId: this.getId()}).toArray();
    }

    async loadCategories() {
        let db = await getDb();
        this.categories = await db.collection('categories').find({shopId: this.getId()}).toArray();
    }

    getCategoryProducts(categoryIds) {
        if (!categoryIds) {
            return this.products;
        }

        return this.products.filter(product => {
            let hasCategories = product.categories && product.categories.length > 0;
            if (!hasCategories) {
                return true;
            }

            let selectedCategoriesOfProduct = product.categories.filter(categoryId => categoryIds.includes(categoryId));
            return selectedCategoriesOfProduct.length > 0;
        });
    }

    getProductAtIndex(index, categoryIds = []) {
        let products = this.getCategoryProducts(categoryIds);
        return products[index];
    }

    getProductsCount(categoryIds = []) {
        let products = this.getCategoryProducts(categoryIds);
        return products.length;
    }

    async getAllCategories() {
        return this.categories;
    }

    async saveMessage(ctx) {
        const db = await getDb();
        const message = ctx.update.message;
        const messageId = message.message_id;
        const chatId = message.chat_id || ctx.chat.id;
        const shopId = ctx.shop.getId();
        const botId = ctx.botInfo.id;

        let chat = {id: chatId, botId, user: message.from, chat: ctx.chat}
        let saveMessage = {chatId, shopId, botId, received: moment().unix()}

        await db.collection('chats').updateOne({id: chatId, botId}, {
            $set: {unread: true, lastMessage: moment().unix()},
            $setOnInsert: chat,
        }, {upsert: true, returnOriginal: false});

        await db.collection('messages').updateOne({botId, messageId}, {
            $set: {message},
            $setOnInsert: saveMessage
        }, {upsert: true, returnOriginal: false});
    }

    hasProductAccess(item, profile) {
        let isOwned = profile.owned && profile.owned.findIndex(owned => owned.id === item.id) !== -1;
        if (isOwned) {
            return true;
        }
    }

    async sendFiles(telegram, chatId, botId, index, item = null) {
        if (!item) {
            item = this.getProductAtIndex(index);
        }

        let hasFiles = item && item.files && item.files.length > 0;
        if (!hasFiles) {
            await telegram.sendMessage(chatId, "У данного товара нет файлов!");
            return;
        }

        if (!FILES_DIR) {
            return;
        }

        let idsSaved = false;
        for (let file of item.files) {
            let hasSavedIds = file.tgFiles && file.tgFiles.length > 0;
            let tgFileId = null;
            if (hasSavedIds) {
                let fileData = file.tgFiles.find(data => data.botId === botId);
                if (fileData) {
                    tgFileId = fileData.fileId || null;
                }
            }

            if (tgFileId) {
                try {
                    await telegram.sendDocument(chatId, tgFileId);
                }
                catch (e) {
                    let [type] = file.type.split('/');
                    if (type === 'video') {
                        await telegram.sendVideo(chatId, tgFileId);
                    }
                }
            }
            else {
                let path = FILES_DIR + '/' + file.serverFile.filename;
                let stream = fs.createReadStream(path);
                let message = await telegram.sendDocument(chatId, {source: stream, filename: file.name});
                let document = message.document || message.video;
                if (document && document.file_id) {
                    if (!hasSavedIds) {
                        file.tgFiles = [];
                    }

                    file.tgFiles.push({
                        botId,
                        fileId: document.file_id,
                    });
                    idsSaved = true;
                }
            }
        }

        if (idsSaved) {
            let db = await getDb();
            await db.collection('products').updateOne({id: item.id, shopId: this.shop.id}, {$set: {files: item.files}});
        }
    }

}