'use strict';

const lo_orderBy = require('lodash.orderby');
const lo_uniq = require('lodash.uniq');
const lo_map = require('lodash.map');
const lo_reject = require('lodash.reject');
const lo_clamp = require('lodash.clamp');
const lo_isString = require('lodash.isstring');
const lo_assign = require('lodash.assign');

const React = require('react');
const ReactDOM = require('react-dom');

const remote = require('electron').remote;
const ipc = require('electron').ipcRenderer;

const RpcChannel = require('../main/shared/rpc-channel');
const rpc = RpcChannel.createWithIpcRenderer('#mainWindow', ipc);

const textUtil = require('../main/shared/text-util');

const Ticket = require('./ticket');
const searchTicket = new Ticket();
const previewTicket = new Ticket();

import { TextField, Avatar, SelectableContainerEnhance, List, ListItem, Subheader, FontIcon, IconButton } from 'material-ui';
import MuiThemeProvider from 'material-ui/lib/MuiThemeProvider';
import getMuiTheme from 'material-ui/lib/styles/getMuiTheme';
import { Notification } from 'react-notification';
import HTMLFrame from './html-frame/html-frame';

const SelectableList = SelectableContainerEnhance(List);

const SEND_INTERVAL = 30; // ms
const CLEAR_INTERVAL = 250; // ms

// HACK to speed up rendering performance
const muiTheme = getMuiTheme({
  userAgent: false
});

class AppContainer extends React.Component {
  constructor() {
    super();

    this.isLoaded = false;
    this.state = {
      query: '',
      results: [],
      selectionIndex: 0,
      toastMessage: '',
      toastOpen: false
    };
    this.toastQueue = [];
    this.lastResultTicket = -1;
  }

  processToast() {
    if (this.toastQueue.length <= 0 ||
        this.state.toastOpen || !remote.getCurrentWindow().isVisible()) {
      return;
    }
    const contents = this.toastQueue.shift();
    const message = textUtil.sanitize(contents.message);
    const duration = contents.duration || 2000;
    this.setState({ toastMessage: message, toastOpen: true });
    this.autoHideToast(duration);
  }

  autoHideToast(duration) {
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.setState({ toastOpen: false });
    }, duration);
  }

  componentDidMount() {
    this.refs.query.focus();
    rpc.define('notifyPluginsLoaded', () => {
      this.isLoaded = true;
      this.setQuery('');
    });
    rpc.define('notifyPluginsReloading', () => {
      this.isLoaded = false;
      this.forceUpdate();
    });
    rpc.define('enqueueToast', (payload) => {
      const { message, duration } = payload;
      this.toastQueue.push({ message, duration });
    });
    rpc.define('log', (payload) => {
      console.log(...payload);
    });
    rpc.define('setQuery', (payload) => {
      this.setQuery(payload);
    });
    rpc.define('setSelectionIndex', (payload) => {
      this.setSelectionIndex(payload);
    });
    rpc.define('requestAddResults', (__payload) => {
      const { ticket, type, payload } = __payload;
      if (searchTicket.current !== ticket)
        return;

      let results = this.state.results;
      let selectionIndex = this.state.selectionIndex;
      if (this.lastResultTicket !== ticket) {
        results = [];
        selectionIndex = 0;
        this.lastResultTicket = ticket;
      }

      if (type === 'add') {
        results = results.concat(payload);
        results = lo_orderBy(results, ['score'], ['desc']);

        // Grouping results
        const groups = lo_uniq(lo_map(results, x => x.group));
        const groupedResults = [];
        for (const x of groups) {
          for (const k of results) {
            if (k.group !== x)
              continue;
            groupedResults.push(k);
          }
        }
        results = groupedResults;
      } else if (type === 'remove') {
        const _id = payload.id;
        results = lo_reject(results, (x) => {
          return (x.id === _id && x.context === payload.context);
        });
      }

      this.setState({ results, selectionIndex });
    });
    rpc.define('requestRenderPreview', (payload) => {
      const { ticket, html } = payload;
      if (previewTicket.current !== ticket)
        return;
      if (this.state.previewHtml === html)
        return;
      this.setState({ previewHtml: html });
    });
    setInterval(this.processToast.bind(this), 200);
  }

  componentDidUpdate(prevProps, prevState) {
    this.updatePreview();
  }

  setQuery(query) {
    const _query = query || '';
    this.setState({ query: _query, selectionIndex: 0 });
    this.refs.query.focus();
    this.search(_query);
  }

  setSelectionIndex(selId) {
    const _selId = selId || 0;
    this.setState({ selectionIndex: _selId });
    this.scrollTo(_selId);
  }

  scrollTo(selectionIndex) {
    const listItem = this.refs[`item.${selectionIndex}`];
    const header = this.refs[`header.${selectionIndex}`];
    const target = header || listItem;
    if (target) {
      const target_dom = ReactDOM.findDOMNode(target);
      const listContainer_dom = ReactDOM.findDOMNode(this.refs.listContainer);

      const rect = target_dom.getBoundingClientRect();
      const parentRect = listContainer_dom.getBoundingClientRect();
      const isOutside = ((rect.bottom - rect.height) <= parentRect.top || (rect.top + rect.height) >= parentRect.bottom);

      if (isOutside) {
        $(listContainer_dom).scrollTo(target_dom);
      }
    }
  }

  search(query) {
    const ticket = searchTicket.newTicket();

    clearTimeout(this.lastSearchTimer);
    this.lastSearchTimer = setTimeout(() => {
      rpc.call('search', { ticket, query });
    }, SEND_INTERVAL);
    clearTimeout(this.lastClearTimer);
    this.lastClearTimer = setTimeout(() => {
      if (this.lastResultTicket === ticket)
        return;
      this.setState({ results: [], selectionIndex: 0 });
    }, CLEAR_INTERVAL);
  }

  execute(item, evt) {
    if (item === undefined)
      return;
    const e = evt.nativeEvent;
    const params = {
      context: item.context,
      id: item.id,
      payload: item.payload,
      extra: {
        keys: {
          altKey: evt.nativeEvent.altKey,
          ctrlKey: evt.nativeEvent.ctrlKey,
          shiftKey: evt.nativeEvent.shiftKey,
          metaKey: evt.nativeEvent.metaKey,
          modifierBitfield: (e.ctrlKey) + (e.altKey << 1) + (e.shiftKey << 2) + (e.metaKey << 3),
        },
      },
    };
    rpc.call('execute', params);
  }

  updatePreview() {
    const selectionIndex = this.state.selectionIndex;
    const selectedResult = this.state.results[selectionIndex];
    if (selectedResult === undefined || !selectedResult.preview) {
      this._renderedPreviewHash = null;
      return;
    }

    const context = selectedResult.context;
    const id = selectedResult.id;
    const payload = selectedResult.payload;
    const previewHash = `${context}.${id}`;

    if (previewHash === this._renderedPreviewHash)
      return;
    this._renderedPreviewHash = previewHash;

    const ticket = previewTicket.newTicket();
    rpc.call('renderPreview', { ticket, context, id, payload });
  }

  handleSelection(selectionDelta, evt) {
    const results = this.state.results;
    const upperSelectionIndex = results.length - 1;

    let newSelectionIndex = this.state.selectionIndex + selectionDelta;
    newSelectionIndex = lo_clamp(newSelectionIndex, 0, upperSelectionIndex);

    if (this.state.selectionIndex === newSelectionIndex)
      return;

    this.setState({ selectionIndex: newSelectionIndex });
    this.scrollTo(newSelectionIndex);
  }

  handleEsc(evt) {
    const query = this.state.query;
    if (query === undefined || query.length <= 0) {
      rpc.call('close');
      return;
    }
    this.setQuery('');
  }

  handleEnter(evt) {
    const results = this.state.results;
    const selectionIndex = this.state.selectionIndex;
    this.execute(results[selectionIndex], evt);
  }

  handleTab(evt) {
    const results = this.state.results;
    const selectionIndex = this.state.selectionIndex;
    const item = results[selectionIndex];
    if (item && item.redirect)
      this.setQuery(item.redirect);
  }

  handleKeyDown(evt) {
    const key = evt.key;
    const keyHandlers = {
      Escape: this.handleEsc.bind(this),
      ArrowUp: this.handleSelection.bind(this, -1),
      ArrowDown: this.handleSelection.bind(this, 1),
      PageUp: this.handleSelection.bind(this, -5),
      PageDown: this.handleSelection.bind(this, 5),
      Enter: this.handleEnter.bind(this),
      Tab: this.handleTab.bind(this)
    };
    const ctrlKeyHandlers = {
      P: this.handleSelection.bind(this, -1),
      p: this.handleSelection.bind(this, -1),
      K: this.handleSelection.bind(this, -1),
      k: this.handleSelection.bind(this, -1),
      N: this.handleSelection.bind(this, 1),
      n: this.handleSelection.bind(this, 1),
      J: this.handleSelection.bind(this, 1),
      j: this.handleSelection.bind(this, 1)
    };
    const selectedHandlerForCtrl = ctrlKeyHandlers[key];
    const selectedHandler = keyHandlers[key];
    if (evt.ctrlKey) {
      if (selectedHandlerForCtrl !== undefined) {
        selectedHandlerForCtrl(evt);
        evt.preventDefault();
      } else if (selectedHandler !== undefined) {
        selectedHandler(evt);
        evt.preventDefault();
      }
    } else {
      if (selectedHandler !== undefined) {
        selectedHandler(evt);
        evt.preventDefault();
      }
    }
  }

  handleChange(evt) {
    const query = this.refs.query.getValue();
    this.setState({ query });
    this.scrollTo(0);
    this.search(query);
  }

  handleUpdateSelectionIndex(evt, index) {
    this.setState({ selectionIndex: index });
  }

  handleItemClick(i, evt) {
    this.execute(this.state.results[i], evt);
  }

  handleKeyboardFocus(evt) {
    this.refs.query.focus();
  }

  displayRightButton(i) {
    const defaultConfig = {
      className: 'fa fa-info',
      color: '#009688',
      hoverColor: '#00695c',
      tooltip: ''
    };
    const result = this.state.results[i];
    if (!result.button) {
      return null;
    }
    const btnConfig = lo_assign({}, defaultConfig, result.button);
    const fontIcon = <FontIcon
      className={ btnConfig.className }
      onClick={ this.handleRightButtonClick.bind(this, result) }
      color={ btnConfig.color }
      hoverColor={ btnConfig.hoverColor }>
      </FontIcon>;
    return <IconButton
      children={ fontIcon }
      tooltip={ btnConfig.tooltip }
      tooltipPosition="top-left"
      style={{ fontSize: 20 }} />;
  }

  handleRightButtonClick(result, evt) {
    evt.stopPropagation();
    const context = result.context;
    const id = result.id;
    const payload = result.payload;
    rpc.call('buttonAction', { context, id, payload });
  }

  parseIconUrl(iconUrl) {
    if (!lo_isString(iconUrl))
      return null;
    if (iconUrl.startsWith('#')) {
      const iconClass = iconUrl.substring(1);
      return <Avatar key="icon" icon={<FontIcon className={iconClass} />} />;
    }
    return <Avatar key="icon" src={iconUrl} />;
  }

  render() {
    const results = this.state.results;
    const selectionIndex = this.state.selectionIndex;
    const selectedResult = results[selectionIndex];

    const list = [];
    const tabIndicator = '<kbd style=\'font-size: 7pt; margin-left: 5px; opacity: 0.8\'>tab</kbd>';
    let lastGroup = null;
    for (let i = 0; i < results.length; ++i) {
      const result = results[i];
      const avatar = this.parseIconUrl(result.icon);
      const rightIcon = this.displayRightButton(i);

      let title = textUtil.extractText(result.title);
      const titleStyle = textUtil.extractTextStyle(result.title);
      if (result.redirect)
        title += tabIndicator;

      const desc = textUtil.extractText(result.desc);
      const descStyle = textUtil.extractTextStyle(result.desc, { fontSize: 13 });

      if (result.group !== lastGroup) {
        const headerId = `header.${i}`;
        list.push(
          <div key={headerId} ref={headerId}>
            <Subheader key="header" style={{ lineHeight: '32px', fontSize: 13 }}>{ result.group }</Subheader>
          </div>
        );
        lastGroup = result.group;
      }
      const itemId = `item.${i}`;
      list.push(
        <ListItem
          key={itemId}
          ref={itemId}
          value={i}
          onKeyboardFocus={this.handleKeyboardFocus.bind(this)}
          style={{ fontSize: 15, lineHeight: '13px' }}
          primaryText={<div style={titleStyle} dangerouslySetInnerHTML={{ __html: title }} />}
          secondaryText={<div style={descStyle} dangerouslySetInnerHTML={{ __html: desc }} />}
          onClick={this.handleItemClick.bind(this, i)}
          onKeyDown={this.handleKeyDown.bind(this)}
          leftAvatar={avatar}
          rightIconButton={rightIcon}
          />
      );
    }

    // Show message if there is no results yet
    if (list.length === 0) {
      const isLoading = !this.isLoaded;
      const _text = isLoading ? 'Loading' : 'Sorry, No Results';
      const _icon = isLoading ? 'fa fa-spinner fa-spin' : 'fa fa-heart';
      list.push(
        <ListItem primaryText={_text}
                  secondaryText="It may take some time to show results"
                  leftAvatar={<Avatar icon={<FontIcon className={_icon} />} />} />
      );
    }

    const containerStyles = { overflowX: 'hidden', transition: 'width 0.35s cubic-bezier(0.23, 1, 0.32, 1)',
                              overflowY: 'auto', width: '100%', height: '440px' };
    let previewBox = null;
    if (selectedResult && selectedResult.preview) {
      const previewStyle = { float: 'left', boxSizing: 'border-box',
                             overflowX: 'hidden', overflowY: 'hidden',
                             padding: '10px', paddingRight: '0px', width: '470px', height: '440px' };
      containerStyles.float = 'left';
      containerStyles.width = '300px';

      previewBox = (
        <div style={previewStyle}>
          <HTMLFrame html={this.state.previewHtml}
                     sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
                     style={{ width: '100%', height: '100%', border: '0' }} />
        </div>
      );
    }

    return (
      <MuiThemeProvider muiTheme={muiTheme}>
      <div>
        <div key="queryWrapper" style={{ position: 'fixed', 'zIndex': 1000, top: 0, width: '776px' }}>
          <div style={{ marginTop: '7px', marginBottom: '-8px', color: '#a7a7a7', fontSize: '0.7em' }}>
            <table style={{ width: '100%' }}>
              <tr>
                <td width="50%">Hain</td>
                <td width="50%" style={{ textAlign: 'right' }}>
                <kbd>↓</kbd> <kbd>↑</kbd> to navigate, <kbd>tab</kbd> to expand(redirect), <kbd>enter</kbd> to execute
                </td>
              </tr>
            </table>
          </div>
          <TextField
            key="query"
            ref="query"
            fullWidth={true}
            value={this.state.query}
            onKeyDown={this.handleKeyDown.bind(this)}
            onChange={this.handleChange.bind(this)}
            />
        </div>
        <div key="containerWrapper">
          <div key="container" ref="listContainer" style={containerStyles}>
            <SelectableList key="list" style={{ paddingTop: '0px', paddingBottom: '0px' }}
                            valueLink={{ value: selectionIndex, requestChange: this.handleUpdateSelectionIndex.bind(this) }}>
              {list}
            </SelectableList>
          </div>
          {previewBox}
        </div>
        <Notification key="notification" isActive={this.state.toastOpen} barStyle={{ maxWidth: '600px', wordWrap: 'break-word' }}
                      message={<div dangerouslySetInnerHTML={{ __html: this.state.toastMessage }} />} />
      </div>
      </MuiThemeProvider>
    );
  }
}

const appContainer = ReactDOM.render(<AppContainer />, document.getElementById('app'));
