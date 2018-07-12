export enum comparisonOperators {
    eq = 'eq',
    ne = 'ne',
    lt = 'lt',
    lte = 'lte',
    gt = 'gt',
    gte = 'gte',
}

export interface ProcessOptions {
    defaultPageSize?: number;
    defaultSortKey?: string;
}

interface QueryParameters {
    [key: string]: string;
}

export interface JsonData {
    data: any[];
    links: {};
    meta: {};
}

// Fields marked always_embed in the osf api code should be added to this constant
// The key is the model and the list contains the relationships to embed.
const alwaysEmbed: { [key: string]: string[] } = {
    contributor: ['users'],
};

// https://stackoverflow.com/a/4760279
export const dynamicSort = (property: string) => {
    let sortOrder = 1;
    let newProp = property;
    if (newProp[0] === '-') {
        sortOrder = -1;
        newProp = newProp.substr(1);
    }
    return (a: any, b: any) => {
        let aAt = a.attributes;
        let bAt = b.attributes;
        if (newProp === 'id') {
            aAt = a;
            bAt = b;
        }
        // eslint-disable-next-line no-nested-ternary
        const result = (aAt[newProp] < bAt[newProp]) ? -1 : (aAt[newProp] > bAt[newProp]) ? 1 : 0;
        return result * sortOrder;
    };
};

export const sort = (request: any, data: any[], options: ProcessOptions): any[] => {
    const { queryParams } = request;
    let { defaultSortKey } = options;
    if (defaultSortKey === undefined) {
        defaultSortKey = 'date_modified';
    }
    let sortKey: string = defaultSortKey;
    if (typeof queryParams === 'object' && 'sort' in queryParams) {
        sortKey = queryParams.sort;
    }
    return data.sort(dynamicSort(sortKey));
};

export const buildQueryParams = (params: QueryParameters): string => {
    let paramString = '?';
    Object.keys(params).forEach(key => {
        if (paramString.length > 1) {
            paramString = `${paramString}&`;
        }
        let encodedValue = params[key];
        if (encodedValue !== null) {
            encodedValue = encodeURIComponent(encodedValue);
        }
        paramString = `${paramString}${key}=${encodedValue}`;
    });
    if (paramString.length > 1) {
        return paramString;
    } else {
        return '';
    }
};

export const paginate = (request: any, data: any[], options: ProcessOptions): JsonData => {
    const total = data.length;
    const { queryParams, url } = request;
    const self = `${url}${buildQueryParams(queryParams)}`;
    let start: number = 0;
    let { defaultPageSize } = options;
    if (defaultPageSize === undefined) {
        defaultPageSize = 10;
    }
    let perPage = defaultPageSize;
    let currentPage = 1;
    if (typeof queryParams === 'object') {
        if ('page[size]' in queryParams && queryParams['page[size]'] !== 0) {
            perPage = queryParams['page[size]'];
        }
        if ('page' in queryParams) {
            currentPage = queryParams.page;
            start = (currentPage - 1) * perPage;
        }
    }
    const pages = Math.ceil(total / perPage);
    const nextPage = Math.min(currentPage + 1, pages);
    const prevPage = Math.max(currentPage - 1, 1);
    const lastPage = pages;

    let prev = null;
    let next = null;

    queryParams.page = 1;
    const first = `${url}${buildQueryParams(queryParams)}`;
    queryParams.page = lastPage;
    const last = `${url}${buildQueryParams(queryParams)}`;
    if (nextPage > currentPage) {
        queryParams.page = nextPage;
        next = `${url}${buildQueryParams(queryParams)}`;
    }
    if (prevPage < currentPage) {
        queryParams.page = prevPage;
        prev = `${url}${buildQueryParams(queryParams)}`;
    }

    const paginatedJson = {
        data: data.slice(start, start + perPage),
        links: {
            self,
            first,
            next,
            prev,
            last,
        },
        meta: {
            total,
            per_page: perPage,
        },
    };
    return paginatedJson;
};

export const embed = (schema: any, request: any, json: JsonData, config: any) => {
    const { queryParams } = request;
    const { data } = json;
    if ('embed' in queryParams && queryParams.embed !== {}) { // If we have embeds query params
        let embedKeys = [];
        if (Array.isArray(queryParams.embed)) {
            embedKeys = queryParams.embed;
        } else {
            embedKeys.push(queryParams.embed);
        }
        for (const embedded of embedKeys) { // Go through the embed keys
            for (const datum of data) { // And for every item in our response
                if (!('embeds' in datum)) { // First make sure it has an embeds array
                    datum.embeds = {};
                }
                const embeddable = schema[datum.type].find(datum.id)[embedded];
                const serializedItems = [];
                let paginatedEmbeddables: JsonData = { data: [], links: {}, meta: {} };
                if (embeddable !== null && embeddable !== undefined) {
                    // TODO: Serialize embedItems
                    const embedModelList = embeddable.models; // Get the items to embed
                    paginatedEmbeddables = paginate(request, embedModelList, {});
                    // Go through each of the items that need to be embedded
                    for (const embedItem of paginatedEmbeddables.data) {
                        const serializedItem = config.serialize(embedItem);
                        if (embedItem.modelName in alwaysEmbed) { // If this kind of thing has auto-embeds
                            // Go through each of the alwaysEmbed strings for this kind of object
                            for (const aeRelationship of alwaysEmbed[embedItem.modelName]) {
                                if (embedItem.fks.indexOf(`${aeRelationship}Id`) !== -1) { // is it in fks?
                                    // If so, embed it
                                    if (!('data' in serializedItem)) { // First make sure it has a data object
                                        serializedItem.data = { embeds: {} };
                                    } else if (!('embeds' in serializedItem.data)) {
                                        serializedItem.data.embeds = {};
                                    }
                                    // Get the items to embed
                                    const aEmbeddable = config.serialize(embedItem[aeRelationship]);
                                    serializedItem.data.embeds[aeRelationship] = {
                                        data: aEmbeddable.data,
                                    };
                                }
                            }
                        } // end alwaysEmbed items
                        serializedItems.push(serializedItem.data);
                    }
                    paginatedEmbeddables.data = serializedItems;
                } // Finished gathering embeddable items
                // TODO: convert embeditems to dictionary if not a toMany relationship
                const peData = paginatedEmbeddables.data;
                if ((Array.isArray(peData) && peData.length > 0) && peData !== null) {
                    datum.embeds[embedded] = paginatedEmbeddables;
                }
            }
        }
    }
    const returnJson = Object.assign(json);
    returnJson.data = data;
    return returnJson;
};

export const compareStrings = (
    actualValue: string,
    comparisonValue: string,
    operator: comparisonOperators,
):
    boolean => {
    switch (operator) {
    case comparisonOperators.eq:
        return actualValue.indexOf(comparisonValue) !== -1;
    case comparisonOperators.ne:
        return actualValue.indexOf(comparisonValue) === -1;
    default:
        throw new Error(`Strings can't be compared with "${operator}".`);
    }
};

export const compareBooleans = (
    actualValue: boolean,
    comparisonValue: boolean,
    operator: comparisonOperators,
):
    boolean => {
    switch (operator) {
    case comparisonOperators.eq:
        return actualValue === comparisonValue;
    case comparisonOperators.ne:
        return actualValue !== comparisonValue;
    default:
        throw new Error(`Booleans can't be compared with "${operator}".`);
    }
};

export const compare = (actualValue: any, comparisonValue: any, operator: comparisonOperators): boolean => {
    if (typeof actualValue === 'string') {
        return compareStrings(actualValue, comparisonValue, operator);
    } else if (typeof actualValue === 'boolean') {
        return compareBooleans(actualValue, comparisonValue, operator);
    } else {
        throw new Error(`We haven't implemented comparisons with "${operator}" yet.`);
    }
};

export const toOperator = (operatorString: string): comparisonOperators => {
    if (!operatorString || operatorString === 'eq') {
        return comparisonOperators.eq;
    } else if (operatorString === 'ne') {
        return comparisonOperators.ne;
    } else if (operatorString === 'lt') {
        return comparisonOperators.lt;
    } else if (operatorString === 'lte') {
        return comparisonOperators.lte;
    } else if (operatorString === 'gt') {
        return comparisonOperators.gt;
    } else if (operatorString === 'gte') {
        return comparisonOperators.gte;
    }
    throw new Error(`The operator ${operatorString} is unknown.`);
};
