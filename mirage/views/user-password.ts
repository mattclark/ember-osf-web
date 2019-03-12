import { HandlerContext, Response } from 'ember-cli-mirage';

export function updatePassword(this: HandlerContext) {
    const attrs = this.normalizedRequestAttrs('user-password');
    const currentPassword = 'oldpassword';

    if (attrs.currentPassword !== undefined) {
        if (attrs.currentPassword === currentPassword) {
            return new Response(204, undefined, undefined);
        }
        return new Response(409, { 'Content-Type': 'application/vnd.api+json' }, {
            errors: [{
                status: 409,
                detail: 'Old password is invalid.',
            }],
        });
    }
    return new Response(400, { 'Content-Type': 'application/vnd.api+json' }, {
        errors: [{
            status: 400,
            detail: 'Password must not be blank.',
        }],
    });
}
