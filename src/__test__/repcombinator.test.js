const Repcombinator = require('../Repcombinator.js');
const report1 = require('../../fixtures/report1.json');
const report2 = require('../../fixtures/report2.json');

function fixtureReport(number) {
    return require(`../../fixtures/report${number}.json`);
}

function createFetchMock() {
    return global.fetch = jest.fn();
}

function mockResponseFor(body, request) {
    return Promise.resolve(Object.assign({
        json: jest.fn(() => Promise.resolve(body)),
        status: 200,
        statusText: 'OK',
        ok: true,
    }, request));
}

describe('Repcombinator', () => {
    let repcombinator;

    beforeEach(() => {
        repcombinator = Repcombinator();
    });

    it('should have added Repcombinator to the global object', () => {
        expect(repcombinator).not.toBeUndefined();
    });

    describe('.getObjectBasedReport()', () => {
        it('should be a function on the Repcombinator', () => {
            expect(repcombinator.getObjectBasedReport).toBeInstanceOf(Function);
        });

        it('should return a report in object format', () => {
            expect(repcombinator.getObjectBasedReport(report1)).toMatchSnapshot();
        });

        it('should return a report in object format with multiple rows', () => {
            expect(repcombinator.getObjectBasedReport(report2)).toMatchSnapshot();
        });
    });

    describe('.combineTableResults()', () => {
        it('should correctly combine two reports', () => {
            expect(repcombinator.combineTableResults([report1, report2])).toMatchSnapshot();
        });
    });

    describe('.requestReport()', () => {
        let fetchMock;
        beforeEach(() => {
            fetchMock = createFetchMock();
        });

        it('should be a function on the Repcombinator', () => {
            expect(repcombinator.requestReport).toBeInstanceOf(Function);
        });

        it('should throw an error when no uid was passed', () => {
            return repcombinator.requestReport()
                .catch(error => {
                    expect(error.message).toEqual('A valid uid should be provided to requestReport, got (undefined)');
                });
        });

        it('should throw an error when an invalid uid was passed', () => {
            return repcombinator.requestReport('2fMh2IjOxvw')
                .catch(error => {
                    expect(error.message).toEqual('A valid uid should be provided to requestReport, got (2fMh2IjOxvw)');
                });
        });

        it('should return the report payload when the report was found', () => {
            fetchMock.mockReturnValueOnce(mockResponseFor(fixtureReport(1)));

            return repcombinator.requestReport('qfMh2IjOxvw')
                .then(report => {
                    expect(report).toMatchSnapshot();
                });
        });

        it('should reject the returned promise when the request failed', () => {
            fetchMock.mockReturnValueOnce(mockResponseFor('', { status: 404, ok: false }));

            return repcombinator.requestReport('qfMh2IjOxvw')
                .catch(error => {
                    expect(error.message).toBe('Report could not be loaded');
                });
        });
    });

    describe('.requestReports()', () => {
        let fetchMock;
        beforeEach(() => {
            fetchMock = createFetchMock();
        });

        it('should throw if the list of reports is not an array', () => {
            repcombinator.requestReports('tWg9OiyV7mu')
                .catch(error => {
                    expect(error.message).toBe('Parameter to requestReports should be an array of uids');
                });
        });

        it('should return a list of reports when all reports are loaded', () => {
            fetchMock
                .mockReturnValueOnce(mockResponseFor(fixtureReport(1)))
                .mockReturnValueOnce(mockResponseFor(fixtureReport(2)));

            return repcombinator.requestReports(['qfMh2IjOxvw', 'tWg9OiyV7mu'])
                .then(reports => {
                    expect(reports).toMatchSnapshot();
                });
        });
    });

    describe('.getCombinedReportForReportUids()', () => {
        let fetchMock;
        beforeEach(() => {
            fetchMock = createFetchMock();
            
            fetchMock
                .mockReturnValueOnce(mockResponseFor(fixtureReport(1)))
                .mockReturnValueOnce(mockResponseFor(fixtureReport(2)));
        });

        it('should resolve to a combined report', () => {
            return repcombinator.getCombinedReportForReportUids(['qfMh2IjOxvw', 'tWg9OiyV7mu'])
                .then((combinedReport) => {
                    expect(combinedReport).toMatchSnapshot();
                });
        });
    });
});
