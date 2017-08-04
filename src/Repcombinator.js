(function (isBrowser, document) {
    function isString(value) {
		return typeof value === 'string';
	}

    function identity(value) {
		return value;
	}

    // =======================================================================================

    function RepcombinatorRenderer(document, renderOptions) {
		function createNode(selector, children) {
			if (!isString(selector)) {
				throw new Error('Selector for creating a node can not be empty');
			}

			const classes = selector.split('.');
			const tagParts = classes.shift().split('#');
			const tagName = tagParts.shift();
			const id = tagParts.shift();

			if (!tagName) {
				throw new Error('No tag name found');
			}

			const node = document.createElement(tagName);
			classes
				.forEach(className => {
					node.classList.add(className);
				});

			(children || [])
				.filter(identity)
				.forEach(child => {
					if (isString(child)) {
						node.appendChild(document.createTextNode(child));
					} else {
						node.appendChild(child);
					}
				});

			return node;
		}

		// =======================================================================================

		function renderHeader(report) {
			const headerCells = report.order
				.map(headerName => {
					const header = report.headers[headerName];
					const isHidden = header.hidden;
					const nodeSelector = `th.report__header__name${isHidden ? '.report__header__name--hidden' : ''}`;

					return createNode(nodeSelector, [header.name]);
				});

			return createNode('thead', [
				createNode('tr.report__header', headerCells)
			]);
		}

		function renderBody(report) {
			const rows = report.rows
				.map(row => {
					const cells = report.order
						.map(headerName => {
							const header = report.headers[headerName];
							const isHidden = header.hidden;
							const nodeSelector = `td.report__row__cell${isHidden ? '.report__row__cell--hidden' : ''}`;

							return createNode(nodeSelector, [row[headerName]])
						});

					return createNode('tr.report__row', cells);
				});

			return createNode('tbody', rows);
		}

		function renderReport(report) {
			return createNode(
				'table.report', 
				[renderHeader(report), renderBody(report)]
			);
		}

		function rendererForCombinedReportInto(targetElement) {
			return function render(report) {
				targetElement.appendChild(renderReport(report));
			};
		}

		function Renderer(targetElement) {
			return {
				render: rendererForCombinedReportInto(targetElement)
			};
		}

		function into(selector) {
			const targetElement = document.querySelector(selector);

			if (!targetElement) {
				throw new Error(`Selector ${selector.toString()} does not match any elements`);
			}

			return Renderer(targetElement);
		}

		return {
			into,
		};
	}

    function Repcombinator(options) {
		// Options
		const API_URL = (options && options.apiUrl) || '../api';
		const HEADERS = assign(
			{ 'content-type': 'application/json' },
			options && options.headers
		);

		// =============================================

		const isArray = Array.isArray;

		function assign(target) {
			const sources = Array.prototype.slice.call(arguments);

			sources
				.filter(identity)
				.forEach(source => {
					Object.keys(source)
						.forEach(key => {
							target[key] = source[key]
						});
				});

			return target;
		}

		function nInList(n) {
			return list => list && list[n];
		}

		function map(mapper, iterable) {
			if (isArray(iterable)) {
				return iterable.map(mapper);
			}

			return iterable => map(mapper, iterable);
		}

		const first = nInList(0);
		const second = nInList(1);

		function isEqual(first, second) {
			if (second) {
				return first === second;
			}

			return second => isEqual(first, second);
		}

		function getObjectEntries(obj) {
			return Object
				.keys(obj)
				.map(key => [key, obj[key]]);
		}

		function compose() {
			function callWithResult(result, func, index) {
				return [func(...result)];
			}
			const funcs = Array.prototype.slice.call(arguments);

			return function () {
				const firstArgs = Array.prototype.slice.call(arguments);

				return funcs
					.reverse()
					.reduce(callWithResult, firstArgs);
			}
		}

		/////////////////////////////////////////////////////////////

		function removeEmptyColumns(report, emptyColumns) {
			function indexNotIn(emptyColumns) {
				return (_, index) => isEqual(emptyColumns.indexOf(index), -1)
			}


			report.headers = report.headers && report.headers.filter(indexNotIn(emptyColumns));
			report.rows = map(row => row.filter(indexNotIn(emptyColumns)))(report.rows || []);

			return report;
		}

		function keepNonEmptyColumns(report) {
			const emptyColumns = getEmptyColumns(report.rows);

			return removeEmptyColumns(report, emptyColumns);
		}

		function getEmptyColumns(rows) {
			const emptyRowMap = rows
				.map(rowValues => (rowValues || [])
                .reduce((acc, value, index) => !value ? acc.concat(index) : acc, []))
				.reduce(
				(acc, indexes) => {
					indexes
						.forEach(index => {
							if (acc[index]) {
								acc[index] += 1;
							} else {
								acc[index] = 1;
							}
						});
					return acc;
				},
				{}
				);

			return getObjectEntries(emptyRowMap)
				.filter(compose(isEqual(rows.length), second))
				.map(first)
				.map(num => parseInt(num, 10));
		}

		function createObjectRowsForReport(report) {
			const headers = (report.headers || {});
			const reportClone = {};

			Object.keys(report)
				.filter(key => !['rows', 'columns'].includes(key))
				.forEach(key => {
					reportClone[key] = report[key];
				});

			if (!reportClone.headersMap) {
				reportClone.headerOrder = headers
					.map(header => header.column);

				reportClone.headersMap = headers
					.reduce((acc, value) => {
						acc[value.column] = value;
						return acc;
					}, {});
			}

			reportClone.objectRows = (report.rows || [])
				.map(rowValues => {
					const rowObject = {};

					rowValues
						.filter(identity)
						.forEach((value, index) => {
							if (headers[index]) {
								rowObject[headers[index].column] = value;
							}
						});

					return rowObject;
				});

			return reportClone;
		}

		function combineObjectReports(objectReports) {
			return objectReports
				.reduce((acc, report) => {
					acc.rows = acc.rows.concat(report.objectRows);

					acc.order = acc.order.concat(
						(report.headerOrder || [])
							.filter(value => !acc.order.includes(value))
					);

					Object
						.keys(report.headersMap)
						.forEach(headerKey => {
							acc.headers[headerKey] = report.headersMap[headerKey];
						});

					return acc;
				}, { rows: [], headers: {}, order: [] });
		}

		function getObjectBasedReport(report) {
			return createObjectRowsForReport(keepNonEmptyColumns(report));
		}

		function combineTableResults(reports) {
			return combineObjectReports(reports.map(getObjectBasedReport));
		}

		function isValidUid(uid) {
			return /[A-z]{1}[A-z0-9]{10}/.test(uid);
		}

		function isResponseOk(response) {
			if (response && response.ok) {
				return Promise.resolve(response);
			}

			return Promise.reject(new Error('Report could not be loaded'));
		}

		function extractResponseBody(response) {
			return response.json();
		}

		function requestReport(uid) {
			if (!isValidUid(uid)) {
				return Promise.reject(new Error(`A valid uid should be provided to requestReport, got (${uid})`));
			}

			const requestInit = {
				headers: HEADERS,
				redirect: 'error',
				credentials: 'include'
			};

			return fetch(`${API_URL}/reportTables/${uid}/data`, requestInit)
				.then(isResponseOk)
				.then(extractResponseBody);
		}

		function requestReports(uids) {
			if (!isArray(uids)) {
				return Promise.reject(new Error('Parameter to requestReports should be an array of uids'));
			}

			return Promise.all(map(requestReport, uids));
		}

		function getCombinedReportForReportUids(uids) {
			return requestReports(uids)
				.then(combineTableResults);
		}

		return {
			combineTableResults,
			getObjectBasedReport,
			requestReports,
			requestReport,
			getCombinedReportForReportUids,
			renderer: RepcombinatorRenderer(document, options && options.render)
		};
	}

    if (isBrowser) {
		window.Repcombinator = Repcombinator;
	} else {
		module.exports = Repcombinator;
	}
})(typeof module === 'undefined', document);
