const { Scenes } = require('telegraf');
const { BaseScene } = Scenes;

const {menuWithControls, clone} = require('../lib/helpers');

const SETTINGS_TEXT = `Выберите категорию курсов. Можно выбирать несколько`;

function isSelectedRecursive(selectedCategoryIds, category) {
    let hasSelectedIds = selectedCategoryIds && selectedCategoryIds.length > 0;
    if (!hasSelectedIds) {
        return false;
    }

    if (selectedCategoryIds.indexOf(category.id) !== -1) {
        return true;
    }

    if (category && category.children && category.children.length > 0) {
        return category.children.reduce((isAnyChildSelected, childCategory) => {
            return isAnyChildSelected || isSelectedRecursive(selectedCategoryIds, childCategory);
        }, false);
    }

    return false;
}
function categoryMenu(selectedCategoryIds, allCategories, pageIndex, levels) {
    const MAX_ITEMS_PER_PAGE = 8;
    let levelCategories = clone(allCategories);
    let hasSelectedLevels = levels && levels.length > 0;

    pageIndex = pageIndex || 0;

    if (hasSelectedLevels) {
        for (const selectedLevelId of levels) {
            let levelCategory = levelCategories.find(category => category.id === selectedLevelId);
            if (levelCategory && levelCategory.children && levelCategory.children.length > 0) {
                levelCategories = levelCategory.children;
            }
        }
    }

    let showPagination = levelCategories.length > MAX_ITEMS_PER_PAGE;

    let pageCategories = showPagination
        ? levelCategories.splice(pageIndex * MAX_ITEMS_PER_PAGE, MAX_ITEMS_PER_PAGE)
        : levelCategories;

    let maxPageIndex = Math.floor(levelCategories.length / MAX_ITEMS_PER_PAGE);
    if (maxPageIndex * MAX_ITEMS_PER_PAGE < levelCategories.length) {
        maxPageIndex+=1;
    }

    let prevPageIndex = pageIndex > 0 ? pageIndex-1 : pageIndex;
    let nextPageIndex = pageIndex < maxPageIndex ? pageIndex+1 : pageIndex;

    let buttons = pageCategories.map(category => {
        let isSelected = isSelectedRecursive(selectedCategoryIds, category);
        let hasChildren = category && category.children && category.children.length > 0;

        let selectedChar = '';
        if (isSelected) {
            selectedChar = hasChildren
                ? '🔻 '
                : '☑ ';
        }

        return {
            code: hasChildren ? 'level_'+category.id : 'category_'+category.id,
            text: selectedChar + category.title,
        }
    });

    let readyButton = hasSelectedLevels
        ? {code: 'back', text: '↩'}
        : {code: 'ready', text: 'Готово'};

    let controls = showPagination
        ? [
            {code: `page_${prevPageIndex}`, text: prevPageIndex !== pageIndex ? '◀' : '➖'},
            readyButton,
            {code: `page_${nextPageIndex}`, text: nextPageIndex !== pageIndex ? '▶': '➖'}]
        : [readyButton];

    return menuWithControls(buttons, 2, controls);
}

module.exports = function () {
    const scene = new BaseScene('settings');

    scene.enter(async ctx => {
        let {page, levels} = ctx.scene.state;
        let categoryIds = ctx.profile.getSelectedCategoryIds();
        let allCategories = await ctx.shop.getAllCategories();

        return ctx.safeReply(
            ctx => ctx.replyWithDisposable('reply', SETTINGS_TEXT, categoryMenu(categoryIds, allCategories, page, levels))
        );
    });

    scene.start(ctx => ctx.scene.enter('menu'));
    scene.action(/level_(.*)/, async ctx => {
        let levelId = ctx.match[1] ? ctx.match[1] : false;

        if (!ctx.scene.state.levels) {
            ctx.scene.state.levels = [];
        }

        if (levelId) {
            ctx.scene.state.levels.push(levelId);
            ctx.scene.state.page = 0;
        }

        return ctx.scene.reenter();
    });

    scene.action(/category_(.*)/, async ctx => {
        if (!ctx.session) {
            return ctx.scene.enter('discover');
        }

        let newCategoryId = ctx.match[1] ? ctx.match[1] : false;
        if (newCategoryId === false) {
            return;
        }

        await ctx.profile.toggleCategory(newCategoryId);

        return ctx.scene.reenter();
    });

    scene.action(/page_(.*)/, async ctx => {
        let page = ctx.match[1];
        ctx.scene.state.page = parseInt(page) || 0;
        return ctx.scene.reenter();
    });

    scene.action('back', async ctx => {
        let levels = ctx.scene.state.levels || [];
        if (levels && levels.length > 0) {
            levels.pop();
        }

        ctx.scene.state.levels = levels;
        ctx.scene.state.page = 0;
        return ctx.scene.reenter();
    });

    scene.action('ready', async ctx => {
        return ctx.scene.enter('discover');
    });

    return scene;
}