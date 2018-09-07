import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { injectIntl, intlShape } from 'react-intl';
import isMobile from 'ismobilejs';
import {
  showNotification,
  hideNotification
} from '../Notifications/Notifications.actions';
import { deactivateScanner } from '../../providers/ScannerProvider/ScannerProvider.actions';
import {
  speak,
  cancelSpeech
} from '../../providers/SpeechProvider/SpeechProvider.actions';
import {
  addBoards,
  changeBoard,
  previousBoard,
  createBoard,
  createTile,
  deleteTiles,
  editTiles,
  focusTile,
  changeOutput
} from './Board.actions';
import TileEditor from './TileEditor';
import messages from './Board.messages';
import Board from './Board.component';
import API from '../../api';
import {
  SCANNING_METHOD_AUTOMATIC,
  SCANNING_METHOD_MANUAL
} from '../Settings/Scanning/Scanning.constants';
import { NOTIFICATION_DELAY } from '../Notifications/Notifications.constants';

export class BoardContainer extends Component {
  static propTypes = {
    /**
     * @ignore
     */
    intl: intlShape.isRequired,
    /**
     * Board history navigation stack
     */
    navHistory: PropTypes.arrayOf(PropTypes.string),
    /**
     * Board to display
     */
    board: PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      tiles: PropTypes.arrayOf(PropTypes.object)
    }),
    /**
     * Board output
     */
    output: PropTypes.arrayOf(
      PropTypes.shape({
        label: PropTypes.string,
        image: PropTypes.string,
        vocalization: PropTypes.string
      })
    ),
    /**
     * Add boards from API
     */
    addBoards: PropTypes.func,
    /**
     * Load board
     */
    changeBoard: PropTypes.func,
    /**
     * Load previous board
     */
    previousBoard: PropTypes.func,
    /**
     * Create board
     */
    createBoard: PropTypes.func,
    /**
     * Create tile
     */
    createTile: PropTypes.func,
    /**
     * Edit tiles
     */
    editTiles: PropTypes.func,
    /**
     * Delete tiles
     */
    deleteTiles: PropTypes.func,
    /**
     * Focuses a board tile
     */
    focusTile: PropTypes.func,
    /**
     * Change output
     */
    changeOutput: PropTypes.func,
    /**
     * Show notification
     */
    showNotification: PropTypes.func,
    deactivateScanner: PropTypes.func,
    displaySettings: PropTypes.object,
    scannerSettings: PropTypes.object
  };

  state = {
    selectedTileIds: [],
    isSelecting: false,
    isLocked: true,
    tileEditorOpen: false,
    translatedBoard: null
  };

  async componentWillMount() {
    const {
      match: {
        params: { id }
      },
      history
    } = this.props;

    const { board, boards, communicator, changeBoard, addBoards } = this.props;
    if (!board || (id && board.id !== id)) {
      let boardId = communicator.rootBoard;
      const boardExists = boards.find(b => b.id === id);

      if (boardExists) {
        boardId = boardExists.id;
      } else if (id) {
        try {
          const boardFromAPI = await API.getBoard(id);
          boardFromAPI.fromAPI = true;
          addBoards([boardFromAPI]);
          boardId = id;
        } catch (e) {}
      }

      changeBoard(boardId);
      const goTo = id ? boardId : `board/${boardId}`;
      history.replace(goTo);
    } else {
      if (!id || id !== board.id) {
        const goTo = id ? board.id : `board/${board.id}`;
        history.replace(goTo);
      }
    }
  }

  componentDidMount() {
    const { board } = this.props;
    const translatedBoard = this.translateBoard(board);
    this.setState({ translatedBoard });
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.match.params.id !== nextProps.match.params.id) {
      const { navHistory } = this.props;
      this.props.changeBoard(nextProps.match.params.id);

      // Was a browser back action?
      if (
        navHistory.length >= 2 &&
        nextProps.match.params.id === navHistory[navHistory.length - 2]
      ) {
        this.props.previousBoard();
      }
    }

    // TODO: perf issues
    const translatedBoard = this.translateBoard(nextProps.board);
    this.setState({ translatedBoard });
  }

  toggleSelectMode() {
    this.setState(prevState => ({
      isSelecting: !prevState.isSelecting,
      selectedTileIds: []
    }));
  }

  selectTile(tileId) {
    this.setState({
      selectedTileIds: [...this.state.selectedTileIds, tileId]
    });
  }

  deselectTile(tileId) {
    const [...selectedTileIds] = this.state.selectedTileIds;
    const tileIndex = selectedTileIds.indexOf(tileId);
    selectedTileIds.splice(tileIndex, 1);
    this.setState({ selectedTileIds });
  }

  toggleTileSelect(tileId) {
    if (this.state.selectedTileIds.includes(tileId)) {
      this.deselectTile(tileId);
    } else {
      this.selectTile(tileId);
    }
  }

  translateBoard(board) {
    if (!board) {
      return null;
    }

    const { intl } = this.props;

    const name = board.nameKey
      ? intl.formatMessage({ id: board.nameKey })
      : board.name;

    const tiles = board.tiles.map(tile => ({
      ...tile,
      label: tile.labelKey
        ? intl.formatMessage({ id: tile.labelKey })
        : tile.label
    }));

    const translatedBoard = {
      ...board,
      name,
      tiles
    };

    return translatedBoard;
  }

  handleEditClick = () => {
    this.setState({ tileEditorOpen: true });
  };

  handleTileEditorCancel = () => {
    this.setState({ tileEditorOpen: false });
  };

  handleEditTileEditorSubmit = tiles => {
    const { board, editTiles } = this.props;
    editTiles(tiles, board.id);
    this.toggleSelectMode();
  };

  handleAddTileEditorSubmit = tile => {
    const { createTile, createBoard, board } = this.props;

    if (tile.loadBoard) {
      const {
        loadBoard: boardId,
        label: boardName,
        labelKey: boardNameKey
      } = tile;

      createBoard(boardId, boardName, boardNameKey);
    }
    createTile(tile, board.id);
  };

  handleAddClick = () => {
    this.setState({
      tileEditorOpen: true,
      selectedTileIds: [],
      isSelecting: false
    });
  };

  handleLockClick = () => {
    this.setState((state, props) => ({
      isLocked: !state.isLocked,
      isSelecting: false,
      selectedTileIds: []
    }));
  };

  handleSelectClick = () => {
    this.toggleSelectMode();
  };

  handleTileClick = tile => {
    if (this.state.isSelecting) {
      this.toggleTileSelect(tile.id);
      return;
    }

    const { changeBoard, changeOutput, speak } = this.props;
    const hasAction = tile.action && tile.action.startsWith('+');

    if (tile.loadBoard) {
      changeBoard(tile.loadBoard);
      this.props.history.push(tile.loadBoard);
    } else {
      changeOutput([...this.props.output, tile]);
      const toSpeak = !hasAction ? tile.vocalization || tile.label : null;
      if (toSpeak) {
        speak(toSpeak);
      }
    }
  };

  handleAddTile = (tile, boardId) => {
    const { intl, createTile, showNotification } = this.props;
    createTile(tile, boardId);
    showNotification(intl.formatMessage(messages.tilesCreated));
  };

  handleDeleteClick = () => {
    const { intl, deleteTiles, showNotification, board } = this.props;
    deleteTiles(this.state.selectedTileIds, board.id);
    this.setState({ selectedTileIds: [] });
    showNotification(intl.formatMessage(messages.tilesDeleted));
  };

  handleLockNotify = countdown => {
    const { intl, showNotification, hideNotification } = this.props;

    if (countdown > 2) {
      return;
    }

    if (!countdown) {
      hideNotification();
      return;
    }

    const clicksToUnlock = `${countdown} ${intl.formatMessage(
      messages.clicksToUnlock
    )}`;

    hideNotification();
    // HACK: refactor Notification container
    setTimeout(() => {
      showNotification(clicksToUnlock);
    });
  };

  handleScannerStrategyNotification = () => {
    const {
      scannerSettings: { strategy },
      showNotification,
      intl
    } = this.props;
    const messagesKeyMap = {
      [SCANNING_METHOD_MANUAL]: messages.scannerManualStrategy,
      [SCANNING_METHOD_AUTOMATIC]: messages.scannerAutomaticStrategy
    };
    showNotification(intl.formatMessage(messagesKeyMap[strategy]));

    if (!isMobile.any) {
      setTimeout(() => {
        showNotification(intl.formatMessage(messages.scannerHowToDeactivate));
      }, NOTIFICATION_DELAY);
    }
  };

  onRequestPreviousBoard() {
    this.props.history.goBack();
    this.props.previousBoard();
  }

  render() {
    const {
      navHistory,
      board,
      focusTile,
      match: {
        params: { id }
      }
    } = this.props;

    if (!this.state.translatedBoard || board.id !== id) {
      return null;
    }

    const disableBackButton = navHistory.length === 1;
    const editingTiles = this.state.tileEditorOpen
      ? this.state.selectedTileIds.map(selectedTileId => {
          const tiles = board.tiles.filter(tile => {
            return tile.id === selectedTileId;
          })[0];

          return tiles;
        })
      : [];

    return (
      <Fragment>
        <Board
          board={this.state.translatedBoard}
          scannerSettings={this.props.scannerSettings}
          deactivateScanner={this.props.deactivateScanner}
          disableBackButton={disableBackButton}
          isLocked={this.state.isLocked}
          isSelecting={this.state.isSelecting}
          onAddClick={this.handleAddClick}
          onDeleteClick={this.handleDeleteClick}
          onEditClick={this.handleEditClick}
          onFocusTile={focusTile}
          onLockClick={this.handleLockClick}
          onLockNotify={this.handleLockNotify}
          onScannerActive={this.handleScannerStrategyNotification}
          onRequestPreviousBoard={this.onRequestPreviousBoard.bind(this)}
          onSelectClick={this.handleSelectClick}
          onTileClick={this.handleTileClick}
          selectedTileIds={this.state.selectedTileIds}
          displaySettings={this.props.displaySettings}
        />
        <TileEditor
          editingTiles={editingTiles}
          open={this.state.tileEditorOpen}
          onClose={this.handleTileEditorCancel}
          onEditSubmit={this.handleEditTileEditorSubmit}
          onAddSubmit={this.handleAddTileEditorSubmit}
        />
      </Fragment>
    );
  }
}

const mapStateToProps = ({
  board,
  communicator,
  language,
  scanner,
  app: { displaySettings }
}) => {
  const activeCommunicatorId = communicator.activeCommunicatorId;
  const currentCommunicator = communicator.communicators.find(
    communicator => communicator.id === activeCommunicatorId
  );

  const activeBoardId = board.activeBoardId;

  return {
    communicator: currentCommunicator,
    board: board.boards.find(board => board.id === activeBoardId),
    boards: board.boards,
    output: board.output,
    scannerSettings: scanner,
    navHistory: board.navHistory,
    displaySettings
  };
};

const mapDispatchToProps = {
  addBoards,
  changeBoard,
  previousBoard,
  createBoard,
  createTile,
  deleteTiles,
  editTiles,
  focusTile,
  changeOutput,
  speak,
  cancelSpeech,
  showNotification,
  hideNotification,
  deactivateScanner
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(injectIntl(BoardContainer));
