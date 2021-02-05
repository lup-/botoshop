import axios from "axios";

export default {
    state: {
        details: false,
        currentRefUser: false,
        refUsersList: [],
        botRefs: [],
    },
    getters: {
        plotlyTotals(state) {
            if (!state.details) {
                return [];
            }

            let totals = [
                {
                    x: state.details.stats.map(item => item.tag),
                    y: state.details.stats.map(item => item.total),
                    type: 'scatter',
                    name: 'Всего',
                }
            ];

            return totals;
        },
        plotlyActive(state) {
            if (!state.details) {
                return [];
            }

            let active = [
                {
                    x: state.details.stats.map(item => item.tag),
                    y: state.details.stats.map(item => item.active),
                    type: 'scatter',
                    name: 'Активных',
                }
            ];

            return active;
        },
        plotlyNew(state) {
            if (!state.details) {
                return [];
            }

            let newUsers = [
                {
                    x: state.details.stats.map(item => item.tag),
                    y: state.details.stats.map(item => item.count),
                    type: 'scatter',
                    name: 'Всего новых',
                    marker: {
                        size: 10,
                    }
                }
            ];

            return newUsers;
        },
        plotlyRefs(state) {
            if (!state.details) {
                return [];
            }

            let refs = state.details.refStats.map(refStat => {
                return {
                    x: refStat.stats.map(item => item.tag),
                    y: refStat.stats.map(item => item.count),
                    type: 'scatter',
                    mode: 'lines',
                    name: refStat.ref ? refStat.ref: 'Органика',
                    line: {
                        width: 2
                    }
                }
            });

            return refs;
        },
        statTable(state) {
            if (!state.details) {
                return {headers: [], rows: []};
            }

            let tags = state.details.stats.map(item => item.tag);

            let rows = tags.map(tag => {
                let columns = {tag};
                let totalItem = state.details.stats.find(item => item.tag === tag);
                let refCols = state.details.refStats.reduce((cols, refs) => {
                    let refItem = refs.stats.find(item => item.tag === tag);
                    let refCode = refs.ref ? refs.ref : '_direct';
                    cols[refCode] = refItem && refItem.count ? refItem.count : 0;
                    return cols;
                }, {});

                columns = Object.assign(columns, refCols);
                columns[`_new`] = totalItem && totalItem.count ? totalItem.count : 0;
                columns[`_active`] = totalItem && totalItem.active ? totalItem.active : 0;
                columns[`_total`] = totalItem && totalItem.total ? totalItem.total : 0;
                return columns;
            });

            let headers = Object.keys(rows[0]).map(colType => {
                let colName = colType;
                let type = 'refs';

                if (colType === 'tag') {
                    colName = 'Время';
                    type = false;
                }

                if (colType === '_direct') {
                    colName = `Органика`;
                }

                if (colType === '_new') {
                    colName = `Всего новых`;
                    type = 'new';
                }

                if (colType === '_active') {
                    colName = `Активных`;
                    type = 'active';
                }

                if (colType === '_total') {
                    colName = `Всего`;
                    type = 'totals';
                }

                return {text: colName, value: colType, type};
            });

            return {headers, rows}
        }
    },
    actions: {
        async loadDetails({commit}, params) {
            params.tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            let response = await axios.post(`/api/stats/details`, params);
            return commit('setDetails', response.data);
        },
    },
    mutations: {
        setDetails(state, stats) {
            state.details = stats;
        },
    }
}