import { options } from 'mongoose'
import React from 'react'
import { useEffect } from 'react'
import { useState } from 'react'
import {
  Button,
  Form,
  Modal,
  Icon,
  Dropdown,
} from 'semantic-ui-react'

import { languages } from '../../../lib/languages'

defaultData = { language: "", display: "", clarity: { authToken: "", url: "" } }
const customData = {
  clarity: {
    // baseUrl: "",
    // createdAt: Date.now(),
    // serverRoot : "",
    // userId: null,
    // firstName: "",
    // fullName: "",
    // lang: "",
    // lastName: "",
    // locale: "en_GB",
    // userName: "",
    // version: "",
    authToken: "",
    url: "",
    // resourceId: null,
    // page: ""
  }
}

function PopupWindow() {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState('')
  const [authToken, setToken] = React.useState('')
  const [url, setUrl] = React.useState('')
  const [display, setDisplay] = React.useState('')
  const [langVal, setLangVal] = useState('')
  const [dissable, setDissable] = React.useState(true)

  handleCustomData = () => {
    let data = (localStorage.getItem('UserContext') != null) ? JSON.parse(localStorage.getItem('UserContext')) : customData;
    setToken(data.clarity.authToken)
    setUrl(data.clarity.url)
    setDisplay(data.display)
    setLangVal(data.language)
    localStorage.setItem('UserContext', JSON.stringify(data));
  }

  const handleChange = (e) => {
    setValue(e.target.value)
    IsJsonString(e.target.value) ? setDissable(false) : setDissable(true)
    // console.log(IsJsonString(value))
  }

  function IsJsonString(str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }

  const handleChangeInputFields = (e) => {
    if (e.target.name == 'authToken') { setToken(e.target.value) }
    if (e.target.name == 'url') { setUrl(e.target.value) }
    if (e.target.name == 'display') { setDisplay(e.target.value) }

    setDissable(false)
    // IsJsonString(value) ? setDissable(false) : setDissable(true)
  }
  var dropval;
  return (
    <Modal
      onClose={() => setOpen(false)}
      onOpen={() => setOpen(true)}
      open={open}
      trigger={(
        <Icon
          name='globe'
          color='grey'
          onClick={this.handleCustomData}
        />
      )}
    >
      <Modal.Header>Set Custom Data</Modal.Header>
      <Modal.Content>
        <Modal.Description>
          <Form>
            <Form.Group widths='equal'>
              <Form.Input name="display" onChange={handleChangeInputFields} value={display} fluid label='Display' placeholder='Display' />
              <Form.Input name="authToken" onChange={handleChangeInputFields} value={authToken} fluid label='Auth Token' placeholder='Auth Token' />
              <Form.Input name="url" onChange={handleChangeInputFields} value={url} fluid label='Url' placeholder='Url' />
              <Form.Select
                placeholder='Select Language'
                fluid
                label='Language'
                value={langVal}
                selection
                options={Object.keys(languages).map(data => ({ value: data, text: data, key: data }))}
                onChange={(e, { value }) => { setLangVal(value); setDissable(false) }}
              />
            </Form.Group>
          </Form>
        </Modal.Description>
      </Modal.Content>
      <Modal.Actions>
        <Button color='black' onClick={() => setOpen(false)}>
          Close
        </Button>
        <Button
          disabled={dissable}
          content="Save"
          labelPosition='right'
          icon='checkmark'
          onClick={() => {
            setOpen(false);
            try {
              defaultData.clarity.authToken = authToken
              defaultData.clarity.url = url
              defaultData.display = display
              defaultData.language = langVal
              localStorage.setItem('UserContext', JSON.stringify(defaultData))
              setDissable(true)
            } catch (err) {
              console.log(err.message)
            }
          }}
          positive
        />
      </Modal.Actions>
    </Modal>
  )
}

export default PopupWindow