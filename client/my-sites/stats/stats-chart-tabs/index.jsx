/** @format */

/**
 * External dependencies
 */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { flowRight } from 'lodash';
import { connect } from 'react-redux';
import { localize } from 'i18n-calypso';

/**
 * Internal dependencies
 */
import { DEFAULT_HEARTBEAT } from 'components/data/query-site-stats/constants';
import compareProps from 'lib/compare-props';
import Chart from 'components/chart';
import Legend from 'components/chart/legend';
import StatsModulePlaceholder from '../stats-module/placeholder';
import Card from 'components/card';
import { recordGoogleEvent } from 'state/analytics/actions';
import { requestChartCounts } from 'state/stats/chart-tabs/actions';
import { getCountRecords, getLoadingTabs } from 'state/stats/chart-tabs/selectors';
import { QUERY_FIELDS } from 'state/stats/chart-tabs/constants';
import { getSiteOption } from 'state/sites/selectors';
import { getSelectedSiteId } from 'state/ui/selectors';
import { buildChartData, getQueryDate } from './utility';
import StatTabs from '../stats-tabs';

class StatModuleChartTabs extends Component {
	static propTypes = {
		activeLegend: PropTypes.arrayOf( PropTypes.string ),
		activeTab: PropTypes.shape( {
			attr: PropTypes.string,
			gridicon: PropTypes.string,
			label: PropTypes.string,
			legendOptions: PropTypes.arrayOf( PropTypes.string ),
		} ),
		availableLegend: PropTypes.arrayOf( PropTypes.string ),
		charts: PropTypes.arrayOf(
			PropTypes.shape( {
				attr: PropTypes.string,
				gridicon: PropTypes.string,
				label: PropTypes.string,
				legendOptions: PropTypes.arrayOf( PropTypes.string ),
			} )
		),
		counts: PropTypes.arrayOf(
			PropTypes.shape( {
				comments: PropTypes.number,
				labelDay: PropTypes.string,
				likes: PropTypes.number,
				period: PropTypes.string,
				posts: PropTypes.number,
				visitors: PropTypes.number,
				views: PropTypes.number,
			} )
		),
		isActiveTabLoading: PropTypes.bool,
		onChangeLegend: PropTypes.func.isRequired,
	};

	intervalId = null;

	componentDidMount() {
		this.props.query && this.startQueryInterval();
	}

	componentDidUpdate( prevProps ) {
		if ( this.props.query && prevProps.queryKey !== this.props.queryKey ) {
			this.startQueryInterval();
		}
	}

	onLegendClick = chartItem => {
		const activeLegend = this.props.activeLegend.slice();
		const chartIndex = activeLegend.indexOf( chartItem );
		let gaEventAction;
		if ( -1 === chartIndex ) {
			activeLegend.push( chartItem );
			gaEventAction = ' on';
		} else {
			activeLegend.splice( chartIndex );
			gaEventAction = ' off';
		}
		this.props.recordGoogleEvent(
			'Stats',
			`Toggled Nested Chart ${ chartItem } ${ gaEventAction }`
		);
		this.props.onChangeLegend( activeLegend );
	};

	startQueryInterval() {
		// NOTE: Unpredictable behavior will arise if DEFAULT_HEARTBEAT < request duration!
		Number.isFinite( this.intervalId ) && clearInterval( this.intervalId );
		this.makeQuery();
		this.intervalId = setInterval( this.makeQuery, DEFAULT_HEARTBEAT );
	}

	makeQuery = () => this.props.requestChartCounts( this.props.query );

	render() {
		const { isActiveTabLoading } = this.props;
		const classes = [ 'stats-module', 'is-chart-tabs', { 'is-loading': isActiveTabLoading } ];

		return (
			<Card className={ classNames( ...classes ) }>
				<Legend
					activeCharts={ this.props.activeLegend }
					activeTab={ this.props.activeTab }
					availableCharts={ this.props.availableLegend }
					clickHandler={ this.onLegendClick }
					tabs={ this.props.charts }
				/>
				{ /* eslint-disable-next-line wpcalypso/jsx-classname-namespace */ }
				<StatsModulePlaceholder className="is-chart" isLoading={ isActiveTabLoading } />
				<Chart
					barClick={ this.props.barClick }
					data={ this.props.chartData }
					loading={ isActiveTabLoading }
				/>
				<StatTabs
					data={ this.props.counts }
					tabs={ this.props.charts }
					switchTab={ this.props.switchTab }
					selectedTab={ this.props.chartTab }
					activeIndex={ this.props.queryDate }
					activeKey="period"
				/>
			</Card>
		);
	}
}

const NO_SITE_STATE = {
	siteId: null,
	counts: [],
	chartData: [],
};

const connectComponent = connect(
	( state, { activeLegend, period: { period }, chartTab, queryDate } ) => {
		const siteId = getSelectedSiteId( state );
		if ( ! siteId ) {
			return NO_SITE_STATE;
		}

		const counts = getCountRecords( state, siteId, period );
		const chartData = buildChartData( activeLegend, chartTab, counts, period, queryDate );
		const loadingTabs = getLoadingTabs( state, siteId, period );
		const isActiveTabLoading = loadingTabs.includes( chartTab ) && chartData.length === 0;
		const quantity = 'year' === period ? 10 : 30;
		const timezoneOffset = getSiteOption( state, siteId, 'gmt_offset' ) || 0;
		const date = getQueryDate( queryDate, timezoneOffset, period, quantity );
		const queryKey = `${ date }-${ period }-${ quantity }-${ siteId }`;
		const query = { chartTab, date, period, quantity, siteId, statFields: QUERY_FIELDS };

		return {
			chartData,
			counts,
			isActiveTabLoading,
			loadingTabs,
			query,
			queryKey,
			siteId,
		};
	},
	{ recordGoogleEvent, requestChartCounts },
	null,
	{
		areStatePropsEqual: compareProps( {
			shallow: [ 'activeTab', 'isActiveTabLoading' ],
			deep: [ 'query', 'loadingTabs' ],
		} ),
	}
);

export default flowRight(
	localize,
	connectComponent
)( StatModuleChartTabs );
