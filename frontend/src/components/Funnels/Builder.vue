<template>
    <v-sheet class="fill-height">
        <v-row class="fill-height network-container">
            <v-col cols="12" class="fill-height">
                <v-card class="fill-height">
                    <v-toolbar dense>
                        <span>Этапы</span>
                        <v-btn-toggle dense class="mx-6">
                            <v-btn text @click="showNewNodeDialog"><v-icon>mdi-plus-circle</v-icon></v-btn>
                            <v-btn text :disabled="!selectedNode" @click="showEditNodeDialog"><v-icon>mdi-pencil-circle</v-icon></v-btn>
                            <v-btn text :disabled="!selectedNode" @click="deleteSelectedStage"><v-icon>mdi-delete-circle</v-icon></v-btn>
                        </v-btn-toggle>
                        <v-divider vertical></v-divider>
                        <span class="mx-6">Переходы</span>
                        <v-btn-toggle dense>
                            <v-btn text :disabled="!selectedNode" @click="showNewEdgeDialog"><v-icon>mdi-plus-circle</v-icon></v-btn>
                            <v-btn text :disabled="!selectedEdge" @click="showEditEdgeDialog"><v-icon>mdi-pencil-circle</v-icon></v-btn>
                            <v-btn text :disabled="!selectedEdge"><v-icon>mdi-delete-circle</v-icon></v-btn>
                        </v-btn-toggle>
                        <v-divider vertical class="mx-6"></v-divider>
                        <v-btn @click="gotoStagesList">К списку</v-btn>
                    </v-toolbar>

                    <v-card-title>{{isNew ? 'Новая воронка' : 'Редактирование воронки'}}</v-card-title>
                    <v-card-text class="fill-height">

                        <network
                            :nodes="nodes"
                            :edges="edges"
                            :options="options"
                            @select-node="selectNode"
                            @select-edge="selectEdge"
                            @drag-end="afterDrag"
                            @deselect-node="selectedNode = false"
                            @deselect-edge="selectedEdge = false"
                        >

                        </network>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
        <stage-dialog
                v-model="newNode"
                :show="addNodeDialog"
                :selected-node="selectedNode"
                :show-link="true"
                :funnel-id="funnelId"
                @cancel="addNodeDialog = false"
                @save="addStage"
        ></stage-dialog>
        <stage-dialog
                v-model="editNode"
                :show="editNodeDialog"
                :selected-node="selectedNode"
                :show-link="false"
                :funnel-id="funnelId"
                @cancel="editNodeDialog = false"
                @save="editStage"
        ></stage-dialog>
        <button-dialog v-model="newEdge" :show="addEdgeDialog" :selected-edge="selectedEdge" @cancel="addEdgeDialog = false" @save="addButton"></button-dialog>
        <button-dialog v-model="editEdge" :show="editEdgeDialog" :selected-edge="selectedEdge" @cancel="editEdgeDialog = false" @save="editButton"></button-dialog>
    </v-sheet>
</template>

<script>
    import CrudEdit from '@/components/CrudEdit';
    import StageDialog from '@/components/Funnels/BuilderDialogs/Stage';
    import ButtonDialog from "@/components/Funnels/BuilderDialogs/Button";
    import { Network } from 'vue-visjs';

    export default {
        extends: CrudEdit,
        components: {Network, StageDialog, ButtonDialog},
        data() {
            return {
                item: {},

                selectedNode: false,
                selectedEdge: false,

                addNodeDialog: false,
                editNodeDialog: false,
                addEdgeDialog: false,
                editEdgeDialog: false,

                newNode: {},
                editNode: {},
                newEdge: {},
                editEdge: {},

                ACTION_LOAD: 'funnel/loadItems',
                ACTION_NEW: 'funnel/newItem',
                ACTION_SAVE: 'funnel/saveItem',
                ACTION_SET_EDIT_ITEM: 'funnel/setEditItem',
                ROUTE_LIST: 'funnelsList',
                STORE_MODULE: 'funnel',

                nodes: [],
                edges: [],
                options: {
                    autoResize: false,
                    height: '100%',
                    width: '100%',
                    locale: 'ru',
                    nodes: {
                        shape: "dot",
                        font: {
                            strokeWidth: 4,
                        }
                    },
                    edges: {
                        arrows: {
                            middle: true,
                        },
                        smooth: {
                            enabled: false,
                        },
                        font: {
                            strokeWidth: 4,
                        },
                        scaling: {
                            label: false
                        }
                    },
                    physics: {
                        enabled: false
                    }
                },
            };
        },
        async mounted() {
            await this.loadStages();
            this.updateGraph();
        },
        watch: {
            stages() {
                this.updateGraph();
            }
        },
        methods: {
            async loadStages() {
                await this.$store.dispatch('stage/loadItems', {funnelId: this.funnelId});
            },
            selectNode({nodes}) {
                this.selectedNode = nodes[0];
            },
            selectEdge({edges}) {
                if (edges.length === 1) {
                    this.selectedEdge = edges[0];
                }
                else {
                    this.selectedEdge = false;
                }
            },
            afterDrag({nodes, pointer}) {
                let itemId = nodes[0];
                let isNode = itemId && itemId.indexOf(':') === -1;
                let isLinkNode = itemId && itemId.indexOf(':link:') !== -1;
                let stageId;

                if (isNode) {
                    stageId = itemId;
                    this.$store.dispatch('stage/saveXYPosition', {stageId, x: pointer.canvas.x, y: pointer.canvas.y});
                }

                if (isLinkNode) {
                    let idParts = itemId.split(':');
                    stageId = idParts[0];
                    let linkIndex = parseInt(idParts[2]);
                    this.$store.dispatch('stage/saveLinkXYPosition', {stageId, linkIndex, x: pointer.canvas.x, y: pointer.canvas.y});
                }
            },
            showNewNodeDialog() {
                if (this.selectedNode) {
                    this.newNode = {previousStageId: this.selectedNode};
                }

                this.addNodeDialog = true;
            },
            showEditNodeDialog() {
                if (!this.selectedNode) {
                    return;
                }

                let editStage = this.$store.getters["stage/byId"](this.selectedNode);
                if (!editStage) {
                    return;
                }

                this.editNode = {title: editStage.title, text: editStage.text};
                this.editNodeDialog = true;
            },
            showNewEdgeDialog() {
                if (this.selectedNode) {
                    this.newEdge = {srcStageId: this.selectedNode};
                }
                this.addEdgeDialog = true;
            },
            showEditEdgeDialog() {
                if (this.selectedEdge) {
                    let [src, dst, edgeType] = this.selectedEdge.split(':');
                    if (this.editEdge && edgeType === 'button') {
                        this.editEdge.srcStageId = src;
                        this.editEdge.dstStageId = dst;
                    }

                    let srcStage = this.$store.getters["stage/byId"](src);
                    let buttonIndex = srcStage
                        ? srcStage.buttons.findIndex(button => button.target === dst)
                        : -1;

                    if (buttonIndex !== -1) {
                        this.editEdge.buttonText = srcStage.buttons[buttonIndex].text;
                    }
                }
                else {
                    this.editEdge = {};
                }

                this.editEdgeDialog = true;
            },
            resetAddStageDialog() {
                this.addNodeDialog = false;
                this.newNode = {};
            },
            resetEditStageDialog() {
                this.editNodeDialog = false;
                this.editNode = {};
            },
            resetAddEdgeDialog() {
                this.addEdgeDialog = false;
                this.newEdge = {};
            },
            resetEditEdgeDialog() {
                this.editEdgeDialog = false;
                this.editEdge = {};
            },
            async addStage(newNode) {
                let previousStageData = newNode.previousStage;
                delete newNode.previousStage;

                await this.$store.dispatch('stage/newItem', {item: newNode, funnelId: this.funnelId});
                let newStage = this.$store.state.stage.lastSavedItem;

                if (previousStageData && previousStageData.id) {
                    let previousStage = this.$store.getters["stage/byId"](previousStageData.id);
                    if (!previousStage.buttons) {
                        previousStage.buttons = [];
                    }
                    previousStage.buttons.push({
                        text: previousStageData.buttonText,
                        type: 'stage',
                        target: newStage.id
                    });
                    await this.$store.dispatch('stage/saveItem', {item: previousStage, funnelId: this.funnelId});
                }
                this.resetAddStageDialog();
                this.updateGraph();
            },
            async editStage(editNode) {
                let currentStageId = this.selectedNode;
                let currentStage = this.$store.getters["stage/byId"](currentStageId);
                currentStage.title = editNode.title;
                currentStage.text = editNode.text;

                await this.$store.dispatch('stage/saveItem', {item: currentStage, funnelId: this.funnelId});
                this.resetEditStageDialog();
                this.updateGraph();
            },
            async deleteSelectedStage() {
                let stageId = this.selectedNode;
                let stage = this.$store.getters['stage/byId'](stageId);
                await this.$store.dispatch('stage/deleteItem', {item: stage, funnelId: this.funnelId});
                this.updateGraph();
            },
            async gotoSelectedStage() {
                let stageId = this.selectedNode;
                this.$router.push({name: 'stageEdit', params: {id: stageId, funnelId: this.funnelId}});
            },
            async gotoStagesList() {
                this.$router.push({name: 'stagesList', params: {funnelId: this.funnelId}});
            },
            async addButton() {
                let srcStage = this.$store.getters["stage/byId"](this.newEdge.srcStageId);
                let button = {
                    text: this.newEdge.buttonText,
                    type: 'stage',
                    target: this.newEdge.dstStageId,
                }

                if (!srcStage.buttons) {
                    srcStage.buttons = [];
                }

                srcStage.buttons.push(button);
                await this.$store.dispatch('stage/saveItem', {item: srcStage, funnelId: this.funnelId});
                this.resetAddEdgeDialog();
                this.updateGraph();
            },
            async editButton() {
                if (!this.selectedEdge) {
                    return;
                }

                let editStage = this.$store.getters["stage/byId"](this.editEdge.srcStageId);
                if (!editStage.buttons) {
                    return;
                }

                let button = {
                    text: this.editEdge.buttonText,
                    type: 'stage',
                    target: this.editEdge.dstStageId,
                }

                let [, oldDstId, ] = this.selectedEdge.split(':');
                let buttonIndex = editStage.buttons.findIndex(button => button.target === oldDstId);

                if (buttonIndex !== -1) {
                    editStage.buttons[buttonIndex] = button;
                    await this.$store.dispatch('stage/saveItem', {item: editStage, funnelId: this.funnelId});
                }

                this.resetEditEdgeDialog();
                this.updateGraph();
            },
            getStageById(searchId) {
                return this.stages.find(stage => stage.id === searchId);
            },
            getStageShows(stageId) {
                let stage = this.getStageById(stageId);
                return stage ? stage.shows || 0 : 0;
            },
            getStagePercent(srcStage, dstStageId) {
                if (!srcStage.shows) {
                    return 0;
                }

                let percent = this.getStageShows(dstStageId) / srcStage.shows * 100;
                return percent < 1 ? parseFloat(percent.toFixed(1)) : Math.round(percent);
            },
            getButtonPercent(srcStage, button) {
                if (!srcStage.shows) {
                    return 0;
                }

                let percent = (button.shows || 0) / srcStage.shows * 100;
                return percent < 1 ? parseFloat(percent.toFixed(1)) : Math.round(percent);
            },
            getStageExits(stageId) {
                let stage = this.getStageById(stageId);
                if (!stage) {
                    return 0;
                }

                let stageExits = stage.shows;
                if (stage.needsAnswer) {
                    let nextStage = this.getStageById(stage.nextStage);
                    stageExits -= nextStage.shows || 0;
                }

                if (stage.buttons && stage.buttons.length > 0) {
                    let movedToNextStages = stage.buttons.reduce((summ, button) => {
                        let nextStageShows = button.shows || 0;
                        return summ + nextStageShows;
                    }, 0);
                    stageExits -= movedToNextStages;
                }

                return stageExits;
            },
            getStageExitsPercent(srcStage) {
                if (!srcStage.shows) {
                    return 0;
                }

                let percent = this.getStageExits(srcStage.id) / srcStage.shows * 100;
                return percent < 1 ? parseFloat(percent.toFixed(1)) : Math.round(percent);
            },

            updateGraph() {
                this.updateNodes();
                this.updateEdges();
            },
            updateNodes() {
                let nodes = [];
                let stageNodes = this.stages.map(stage => {
                    let node = {
                        id: stage.id,
                        value: stage.shows,
                        label: stage.title,
                        title: stage.text,
                    }

                    if (stage.graph && stage.graph.x && stage.graph.y) {
                        node.x = stage.graph.x;
                        node.y = stage.graph.y;
                    }

                    return node;
                });

                let linkNodes = this.stages.reduce( (nodes, stage) => {
                    let linkButtons = stage.buttons
                        ? stage.buttons
                            .map( (button, originalIndex) => ({...button, originalIndex}) )
                            .filter(button => button.type === 'link')
                        : [];

                    if (linkButtons.length === 0) {
                        return nodes;
                    }

                    nodes = nodes.concat(linkButtons.map(button => {
                        let node = {
                            id: stage.id + ':link:' + button.originalIndex,
                            shape: 'square',
                            value: 0,
                            label: button.text,
                            title: stage.target,
                        }

                        if (button.graph && button.graph.x && button.graph.y) {
                            node.x = button.graph.x;
                            node.y = button.graph.y;
                        }

                        return node;
                    }));

                    return nodes;
                }, []);

                nodes = nodes.concat(stageNodes).concat(linkNodes);
                this.$set(this, 'nodes', nodes);
                return nodes;
            },
            updateEdges() {
                let edges = [];
                let stageEdges = this.stages.reduce( (edges, stage) => {
                    if (stage.needsAnswer || stage.isPoll) {
                        edges.push({
                            'id': stage.id + ':' + stage.nextStage + ':answer',
                            'from': stage.id,
                            'to': stage.nextStage,
                            'value': this.getStageShows(stage.nextStage),
                            'label': this.getStagePercent(stage, stage.nextStage)+'%', 'font': { align: "bottom", color: '#3e7ce2' }
                        })
                    }

                    if (stage.hasTimer) {
                        edges.push({
                            'id': stage.id + ':' + stage.nextStage + ':timer',
                            'from': stage.id,
                            'to': stage.nextStage,
                            'dashes': [10, 18],
                            'value': this.getStageShows(stage.nextStage),
                            'label': this.getStagePercent(stage, stage.nextStage)+'%', 'font': { align: "bottom", color: '#3e7ce2' }
                        })
                    }

                    let hasButtons = stage.buttons && stage.buttons.length > 0;
                    if (!hasButtons) {
                        return edges;
                    }

                    let nextStageButtons = stage.buttons.filter(button => button.type === 'stage');
                    let linkButtons = stage.buttons
                        .map( (button, originalIndex) => ({...button, originalIndex}) )
                        .filter(button => button.type === 'link')

                    if (nextStageButtons.length > 0) {
                        edges = edges.concat(nextStageButtons.filter(button => {
                            let duplicateLink = (stage.needsAnswer || stage.hasTimer) && button.target === stage.nextStage;
                            return Boolean(button.target) && !duplicateLink;
                        }).map(button => {
                            return {
                                'id': stage.id + ':' + button.target + ':button',
                                'from': stage.id,
                                'to': button.target,
                                'value': button.shows,
                                'label': button.text + ': ' + this.getButtonPercent(stage, button)+'%', 'font': { align: "bottom", color: '#3e7ce2' }
                            }
                        }));
                    }

                    if (linkButtons.length > 0) {
                        edges = edges.concat(linkButtons.map(button => {
                            return {
                                'id': stage.id + ':hrefButton' + button.originalIndex,
                                'from': stage.id,
                                'to': stage.id + ':link:' + button.originalIndex,
                                'value': button.shows,
                                'label': button.text + ': ' + this.getButtonPercent(stage, button)+'%', 'font': { align: "bottom", color: '#3e7ce2' }
                            }
                        }));
                    }

                    let exitEdge = {
                        from: stage.id,
                        to: stage.id,
                        color: {color: 'red', highlight: 'red'},
                        arrows: { middle: false },
                        value: this.getStageExits(stage.id),
                        label: '-'+this.getStageExitsPercent(stage)+'%', 'font': { align: "right", color: 'red' }
                    }
                    edges.push(exitEdge);

                    return edges;
                }, []);

                edges = edges.concat(stageEdges);
                this.$set(this, 'edges', edges);
                return edges;
            },
        },
        computed: {
            funnelId() {
                return this.itemId;
            },
            stages() {
                return this.$store.state.stage.list;
            },
        }
    }
</script>

<style>
    .network-container {margin: 0}
    .network-container .v-card {display: flex; flex-direction: column;}
    .network-container .v-card__text > div {height: 100%}
</style>