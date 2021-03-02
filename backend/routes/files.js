const fs = require('fs');
const path = require('path');
const shortid = require('shortid');
const BASE_DOWNLOAD_URL = process.env.BASE_DOWNLOAD_URL;
const UPLOAD_DIR = process.env.UPLOAD_DIR;

module.exports = {
    async getLink(ctx) {
        let file = ctx.file;

        let newFileName = shortid() + '_'+file.originalname;
        let uploadedPath = file.path;
        let targetPath = path.join(file.destination, newFileName);

        fs.copyFileSync(uploadedPath, targetPath);
        fs.unlinkSync(uploadedPath);

        let link = BASE_DOWNLOAD_URL + newFileName;
        file.path = targetPath;
        file.filename = newFileName;

        ctx.body = {link, file};
    },
    async deleteFile(ctx) {
        let file = ctx.request.body.file;
        try {
            let catDelete = file.path.indexOf(UPLOAD_DIR) === 0;
            if (catDelete) {
                fs.unlinkSync(file.path);
                ctx.body = {success: true};
            }
            else {
                ctx.body = {success: false, error: 'нет прав для удаления файла'};
            }
        }
        catch (e) {
            ctx.body = {success: false, error: e.toString()};
        }
    }
}