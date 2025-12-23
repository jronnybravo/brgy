export class Permission {
    static DO_EVERYTHING = 'Do Everything';

    static MANAGE_USERS = 'Manage Users';
    static CREATE_USERS = 'Create Users';
    static READ_USERS = 'Read Users';
    static UPDATE_USERS = 'Update Users';
    static DELETE_USERS = 'Delete Users';

    static MANAGE_ROLES = 'Manage Roles';
    static CREATE_ROLES = 'Create Roles';
    static READ_ROLES = 'Read Roles';
    static UPDATE_ROLES = 'Update Roles';
    static DELETE_ROLES = 'Delete Roles';

    static MANAGE_PEOPLE = 'Manage People';
    static CREATE_PEOPLE = 'Create People';
    static READ_PEOPLE = 'Read People';
    static UPDATE_PEOPLE = 'Update People';
    static DELETE_PEOPLE = 'Delete People';

    static MANAGE_ASSISTANCES = 'Manage Assistances';
    static CREATE_ASSISTANCES = 'Create Assistances';
    static READ_ASSISTANCES = 'Read Assistances';
    static UPDATE_ASSISTANCES = 'Update Assistances';
    static DELETE_ASSISTANCES = 'Delete Assistances';

    static getHierarchy() {
        return {
            [this.DO_EVERYTHING]: {
                [this.MANAGE_USERS]: {
                    [this.READ_USERS]: true,
                    [this.CREATE_USERS]: { requires: [ this.READ_USERS ] },
                    [this.UPDATE_USERS]: { requires: [ this.READ_USERS ] },
                    [this.DELETE_USERS]: { requires: [ this.READ_USERS ] },
                },
                [this.MANAGE_ROLES]: {
                    [this.READ_ROLES]: true,
                    [this.CREATE_ROLES]: { requires: [ this.READ_ROLES ] },
                    [this.UPDATE_ROLES]: { requires: [ this.READ_ROLES ] },
                    [this.DELETE_ROLES]: { requires: [ this.READ_ROLES ] },
                },
                [this.MANAGE_PEOPLE]: {
                    [this.READ_PEOPLE]: true,
                    [this.CREATE_PEOPLE]: { requires: [ this.READ_PEOPLE ] },
                    [this.UPDATE_PEOPLE]: { requires: [ this.READ_PEOPLE ] },
                    [this.DELETE_PEOPLE]: { requires: [ this.READ_PEOPLE ] },
                },
                [this.MANAGE_ASSISTANCES]: {
                    [this.READ_ASSISTANCES]: true,
                    [this.CREATE_ASSISTANCES]: { requires: [ this.READ_ASSISTANCES] },
                    [this.UPDATE_ASSISTANCES]: { requires: [ this.READ_ASSISTANCES] },
                    [this.DELETE_ASSISTANCES]: { requires: [ this.READ_ASSISTANCES] },
                },
            }
        };
    }

    static getPermissionPath(permission: string): string[] {
        const hierarchy = (this as any).getHierarchy();
        const stack: [Record<string, any>, string[]][] = [[hierarchy, []]];
        while (stack.length > 0) {
            const [obj, path] = stack.pop()!;
            for (const key in obj) {
                if (key === permission) {
                    return [...path, permission];
                }
                if (typeof obj[key] === 'object') {
                    stack.push([obj[key], [...path, key]]);
                }
            }
        }
        return [];
    }

    static getAllPermissions(): string[] {
        const permissions: string[] = [];

        const stack: Record<string, any>[] = [(this as any).getHierarchy()];
        while (stack.length > 0) {
            const obj = stack.pop()!;
            for (const key in obj) {
                permissions.push(key);
                if (typeof obj[key] === 'object') {
                    stack.push(obj[key]);
                }
            }
        }

        return permissions;
    }
}