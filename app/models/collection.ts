import { computed } from '@ember/object';
import DS from 'ember-data';

import CollectedMetadatumModel, { choiceFields } from './collected-metadatum';
import CollectionProviderModel from './collection-provider';
import NodeModel from './node';
import OsfModel from './osf-model';
import RegistrationModel from './registration';

const { attr, belongsTo, hasMany } = DS;

export type ChoicesFields =
    'collectedTypeChoices' |
    'issueChoices' |
    'programAreaChoices' |
    'statusChoices' |
    'volumeChoices';

export const choicesFields = choiceFields.map(field => `${field}Choices`) as ChoicesFields[];

export default class CollectionModel extends OsfModel {
    @attr('fixstring') title!: string;
    @attr('date') dateCreated!: Date;
    @attr('date') dateModified!: Date;
    @attr('boolean') bookmarks!: boolean;
    @attr('boolean') isPromoted!: boolean;
    @attr('boolean') isPublic!: boolean;
    @attr('array') collectedTypeChoices!: string[];
    @attr('array') issueChoices!: string[];
    @attr('array') programAreaChoices!: string[];
    @attr('array') statusChoices!: string[];
    @attr('array') volumeChoices!: string[];

    @belongsTo('collection-provider')
    provider!: DS.PromiseObject<CollectionProviderModel> & CollectionProviderModel;

    @hasMany('node', { inverse: null })
    linkedNodes!: DS.PromiseManyArray<NodeModel>;

    @hasMany('registration', { inverse: null })
    linkedRegistrations!: DS.PromiseManyArray<RegistrationModel>;

    @hasMany('collected-metadatum', { inverse: 'collection' })
    collectedMetadata!: DS.PromiseManyArray<CollectedMetadatumModel>;

    @computed(`{${choicesFields.join()}}.length`)
    get displayChoicesFields() {
        return choicesFields.filter(field => !!this[field].length);
    }
}

declare module 'ember-data/types/registries/model' {
    export default interface ModelRegistry {
        collection: CollectionModel;
    } // eslint-disable-line semi
}
