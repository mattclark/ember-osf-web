import { alias } from '@ember/object/computed';
import DS from 'ember-data';
import { Link } from 'jsonapi-typescript';

import OsfModel, { OsfLinks } from './osf-model';
import UserModel from './user';

const { attr, belongsTo } = DS;

export interface UserEmailLinks extends OsfLinks {
    resend_confirmation: Link; // eslint-disable-line camelcase
}

export default class UserEmailModel extends OsfModel {
    @attr() links!: UserEmailLinks;
    @attr() emailAddress!: string;
    @attr('boolean') confirmed!: boolean;
    @alias('confirmed') isConfirmed!: boolean;
    @attr('boolean') verified!: boolean;
    @attr('boolean') primary!: boolean;
    @alias('primary') isPrimary!: boolean;
    @attr('boolean') isMerge!: boolean;

    @belongsTo('user', {
        inverse: 'emails',
    }) user!: DS.PromiseObject<UserModel> & UserModel;

    existingEmails: Set<string> = new Set();
    invalidEmails: Set<string> = new Set();
}

declare module 'ember-data/types/registries/model' {
    export default interface ModelRegistry {
        'user-email': UserEmailModel;
    } // eslint-disable-line semi
}
