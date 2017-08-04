const Repcombinator = require('../Repcombinator.js');
const combinedReportFixture = require('../../fixtures/combinedReport.json');

describe('Repcombinator renderer', () => {
    let repcombinator;

    beforeEach(() => {
        repcombinator = Repcombinator();
    });

    it('should have a rederer on the repcombinator', () => {
        expect(repcombinator.renderer).not.toBeUndefined();
    });

    describe('renderer', () => {
        beforeEach(() => {
            document.body.innerHTML = '<div id="reports"></div>';
        });

        it('should have a into method', () => {
            expect(repcombinator.renderer.into).toBeInstanceOf(Function);
        });

        it('should throw if the provided element does not exist', () => {
            expect(() => repcombinator.renderer.into('div#myReports')).toThrow('Selector div#myReports does not match any elements');
        });

        describe('headers', () => {
            it('should render the headers into the document', () => {
                repcombinator.renderer
                    .into('div#reports')
                    .render(combinedReportFixture);

                expect(document.querySelector('#reports').innerHTML).toMatchSnapshot();
            });
        });
    });
});
