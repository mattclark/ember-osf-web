import { settled } from '@ember/test-helpers';
import setupMirage from 'ember-cli-mirage/test-support/setup-mirage';
import { percySnapshot } from 'ember-percy';
import { module, test } from 'qunit';

import { visit } from 'ember-osf-web/tests/helpers';
import { setupEngineApplicationTest } from 'ember-osf-web/tests/helpers/engines';

module('Registries | Acceptance | overview form schemas', hooks => {
    setupEngineApplicationTest(hooks, 'registries');
    setupMirage(hooks);

    test('All registration schemas render', async assert => {
        server.loadFixtures('schema-blocks');
        server.loadFixtures('registration-schemas');

        for (const registrationSchema of server.schema.registrationSchemas.all().models) {
            const registration = server.create('registration', {
                registrationSchema,
                provider: server.create('registration-provider', { id: 'osf' }),
            });
            await visit(`/${registration.id}`);
            await settled();

            const msg = `Registration form renders for schema ${registrationSchema.id}`;

            await percySnapshot(msg);
            await settled();
            assert.dom('[data-test-page-heading]').exists({
                count: registrationSchema.schemaBlocks!.filter(item => item.blockType === 'page-heading').length,
            }, msg);
        }
    });
});
