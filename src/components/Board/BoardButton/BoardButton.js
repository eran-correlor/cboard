import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import classNames from 'classnames';

import Symbol from '../../Symbol';
import './BoardButton.css';

class BoardButton extends PureComponent {
  static propTypes = {
    /**
     * @ignore
     */
    className: PropTypes.string,
    /**
     * @ignore
     */
    children: PropTypes.node,
    /**
     * Board button ID
     */
    id: PropTypes.string,
    /**
     * Label to display
     */
    label: PropTypes.string,
    /**
     * Text to vocalize, takes precedence over label when speaking
     */
    vocalization: PropTypes.string,
    /**
     * Image source path
     */
    img: PropTypes.string,
    /**
     * Board to load on click
     */
    loadBoard: PropTypes.string,
    /**
     * Callback fired when clicking a button
     */
    onClick: PropTypes.func,
    /**
     * Callback fired when button is focused
     */
    onFocus: PropTypes.func,
    /**
     * If true, button element will be focused
     */
    hasFocus: PropTypes.bool
  };

  componentDidMount() {
    this.updateFocus();
  }

  componentDidUpdate() {
    this.updateFocus();
  }

  updateFocus() {
    if (this.props.hasFocus) {
      this.buttonElement.focus();
    }
  }

  handleClick = () => {
    const {
      id,
      type,
      label,
      vocalization,
      img,
      loadBoard,
      onClick
    } = this.props;
    const button = { id, type, label, vocalization, img, loadBoard };
    onClick(button);
  };

  handleFocus = () => {
    const { id, onFocus } = this.props;
    onFocus(id);
  };

  render() {
    const { className, children, loadBoard, label, img } = this.props;

    return (
      <button
        className={classNames('BoardButton', className, {
          'BoardButton--folder': !!loadBoard
        })}
        onFocus={this.handleFocus}
        onClick={this.handleClick}
        ref={element => (this.buttonElement = element)}
      >
        <Symbol label={<FormattedMessage id={label} />} img={img} />
        {children}
      </button>
    );
  }
}

export default BoardButton;
