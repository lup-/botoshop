const fs = require('fs');
const path = require('path');
const shortid = require('shortid');
const {getDb} = require('../modules/Database');
const cloneDeep = require('lodash.clonedeep');

const BASE_DOWNLOAD_URL = process.env.BASE_DOWNLOAD_URL;
const UPLOAD_DIR = process.env.UPLOAD_DIR;

function dataUriToBuffer(uri) {
    let data = uri.split(',')[1];
    return Buffer.from(data,'base64');
}


(async () => {
    let db = await getDb();
    let stages = await db.collection('stages').find().toArray();
    for (let stage of stages) {
        let hasPhotos = stage && stage.photos && stage.photos.length > 0;
        if (!hasPhotos) {
            continue;
        }

        let photosUpdated = false;
        let newPhotos = cloneDeep(stage.photos);
        for (let photoIndex in stage.photos) {
            let photo = stage.photos[photoIndex];
            let hasDataUrl = photo.src && photo.src.indexOf('data:') === 0;
            if (!hasDataUrl) {
                continue;
            }

            let srcBuffer = dataUriToBuffer(photo.src);
            let newFileName = shortid() + '_'+photo.name;
            let filePath = path.join(UPLOAD_DIR, newFileName);
            let link = BASE_DOWNLOAD_URL + newFileName;

            fs.writeFileSync(filePath, srcBuffer);
            let stats = fs.statSync(filePath)

            let serverFile = {
                destination: UPLOAD_DIR,
                encoding: "7bit",
                fieldname: "file",
                filename: newFileName,
                mimetype: photo.type,
                originalname: photo.name,
                path: filePath,
                size: stats.size,
            }

            let newPhoto = {
                file: {},
                serverFile,
                src: link,
                type: photo.type,
                name: photo.name,
            }

            photosUpdated = true;
            newPhotos[photoIndex] = newPhoto;
        }

        if (photosUpdated) {
            await db.collection('stages').updateOne({id: stage.id, funnelId: stage.funnelId}, {$set: {photos: newPhotos}});
            console.log(`${stage.id} updated`);
        }
        else {
            console.log(`${stage.id} skipped`);
        }
    }

    process.exit();
})();