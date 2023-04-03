import React, {
    useRef, useState, useEffect, useContext,
} from 'react';
import PropTypes, { element } from 'prop-types';
import {
    Embed, Input, Button, Modal, Icon, Dimmer, Loader, Radio, Form, Dropdown, TextArea, Segment, Grid, Divider, GridColumn, Label, Container, ListItem
} from 'semantic-ui-react';
import { NativeTypes } from 'react-dnd-html5-backend-cjs';
import { useDrop } from 'react-dnd-cjs';
import { ResponseContext } from './BotResponsesContainer';
import { ProjectContext } from '../../../layouts/context';
import { wrapMeteorCallback } from '../../utils/Errors';
import { Types } from 'mongoose';

export default function TableThumbnail(props) {
    const {
        data, headings, limitrow, editable, onChange, otherActions, className, stylehead, stylebody
    } = props;
    const [viewtext, setViewtext] = useState(true);
    const [editValue, setEditValue] = useState({});
    const [newheadings, setNewheadings] = useState(headings);
    const [newlimitrow, setNewlimitrow] = useState(limitrow);
    const [rows, setRows] = useState(data);
    const [modalOpen, setModalOpen] = useState(false);
    const [newheadStyle, setNewHeadStyle] = useState(stylehead);
    const [newbodystyle, setNewbodystyle] = useState(stylebody);
    const { project: { _id: projectId }, language } = useContext(ProjectContext);
    useEffect(() => setRows(data), [data]);
    useEffect(() => setNewheadings(headings), [headings]);
    useEffect(() => setNewlimitrow(limitrow), [limitrow]);
    useEffect(() => {
        const timer = setTimeout(()=>setTableFromBox(),1000);
        return () => clearTimeout(timer);
    }, [rows, newheadings, newlimitrow, newheadStyle, newbodystyle]);
    useEffect(() => setNewHeadStyle(stylehead), [stylehead]);
    useEffect(() => setNewbodystyle(stylebody), [stylebody]);

    const tableRef = useRef();
    const tableheadRef = useRef();

    const defHeadStyle = () => {
        return { style: { cssText: newheadStyle } };
    }

    const defBodyStyle = () => {
        return { style: { cssText: newbodystyle } };
    }

    const handleAddRow = () => {
        const item = {text: '', payload_type: 'text'};
        let pushCol = [];
        if(newheadings.length != 0) {
            for(let i = 0; i<newheadings.length; i++){
                pushCol.push(item);
            }
            
        setRows([...rows, pushCol])
        } else alert("You can't add row without a heading")
    }

    const handleAddColum = () => {
        const item = {text: '', payload_type: 'text'};
        var temphead = [...newheadings];
        temphead.push('');
        setNewheadings(temphead);
        var temprow = [...rows];
        temprow.forEach(element => {
            element.push(item)
        });
        setRows(temprow)
    }

    const handleDeleteColum = () => {
        var temphead = [...newheadings];
        temphead.splice(-1);
        setNewheadings(temphead);
        var temprow = [...rows];
        temprow.forEach(element => {
            element.splice(-1)
        });
        setRows(temprow);
    }

    const handleRemoveSpecificRow = (idx) => {
        var temprow = [...rows];
        temprow.splice(idx, 1);
        setRows(temprow);
    }

    const handleRemoveSpecificColum = (idx) => {
        var temphead = [...newheadings];
        temphead.splice(idx, 1);
        setNewheadings(temphead);
        var temprow = [...rows];
        temprow.forEach(element => {
            element.splice(idx, 1)
        });
        setRows(temprow);
        setModalOpen(false);
    }

    const handleAddSpecificColum = (idx) => {
        var temphead = [...newheadings];
        temphead.splice(idx+1, 0, '');
        setNewheadings(temphead);
        var temprow = [...rows];
        temprow.forEach(element => {
            element.splice(idx+1, 0, {text: '', payload_type: 'text'})
        });
        setRows(temprow);
        setModalOpen(false);
    }

    const handleChangeHead = (e) => {
        let index = editValue.outerindex;
        let fieldValue = e.target.value;
        var temphead = [...newheadings];
        var tempObj = newheadings[index];
        tempObj = fieldValue;
        temphead[index] = tempObj;
        setNewheadings(temphead);
    }

    const setTableFromBox = () => {
        onChange(newheadings, rows, newlimitrow, newheadStyle, newbodystyle);
        Meteor.call('delete.table', projectId, data, language, wrapMeteorCallback);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            setModalOpen(false);
        }
    };

    const [{ canDrop, isOver }, drop] = useDrop({
        accept: [NativeTypes.FILE],
        drop: item => handleFileDrop(item.files),
        collect: monitor => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    });

    const updateText = (e) => {
        let prope = editValue.innerindex;
        let index = editValue.outerindex;
        let fieldValue = {"text": e.target.value, "payload": editValue.data.payload, "payload_type": editValue.data.payload_type};
    
        var tempRows = [...rows];
        var tempObj = rows[index];
        tempObj[prope] = fieldValue;
    
        tempRows[index] = tempObj;
        setRows(tempRows);
    };

    const updatePayload = (e) => {
        let prope = editValue.innerindex;
        let index = editValue.outerindex;
        let fieldValue = {"text": editValue.data.text, "payload": e.target.value, "payload_type": editValue.data.payload_type};
    
        var tempRows = [...rows];
        var tempObj = rows[index];
        tempObj[prope] = fieldValue;
    
        tempRows[index] = tempObj;
        setRows(tempRows);
    };

    const updateType = (e) => {
        let prope = editValue.innerindex;
        let index = editValue.outerindex;
        let fieldValue = {"text": editValue.data.text, "payload": editValue.data.payload, "payload_type": e.target.value};
    
        var tempRows = [...rows];
        var tempObj = rows[index];
        tempObj[prope] = fieldValue;
    
        tempRows[index] = tempObj;
        setRows(tempRows);
    };

    const renderSetTableHead = () => (
        <div className={`image-modal ${canDrop && isOver ? 'upload-target' : ''}`}>
            <div className='side-by-side middle'>
                <div>    
                    <b>Display label</b>&nbsp;&nbsp;
                    <Input
                    ref={tableheadRef}
                    autoFocus
                    value={editValue.headings}
                    onChange={(e)=> {e.preventDefault(); setEditValue({headings: e.target.value, outerindex: editValue.outerindex}); handleChangeHead(e);}}
                    placeholder='Value'
                    onKeyDown={handleKeyDown}
                    size='small'
                    data-cy='table-input'
                    className='table-input'
                    />&nbsp;&nbsp;
                    <Button onClick={(e) => handleRemoveSpecificColum(editValue.outerindex)} className="ui red button" size='small' content='Delete' />&nbsp;
                    <Button onClick={(e) => handleAddSpecificColum(editValue.outerindex)} className="ui red button" size='small' content='Add' />
                    <br /><br />
                    <i>Hint: Hit Enter (&crarr;) to save the value</i>
                    <Button style={{background: "transparent",position: "absolute",top: "-5px",right: "-25px"}} onClick={()=> setModalOpen(false)}><Icon name='close'/></Button>
                </div>
            </div>
        </div>
    );

    const setText = () => {
        if (editValue.data == '' || editValue.data == null){
            return 'Text';
        } else {
            return editValue.data.text;
        }
    }

    const payloadVal = (editValue) => {
        if (editValue.data.payload == undefined){
            return ''
        } else{
            return editValue.data.payload
        }
    }
    
    const setPayloadType = () => {
        if (editValue.data == '' || editValue.data == null){
            return 'payload type';
        } else {
            return editValue.data.payload_type;
        }
    }
    const setPayload = () => {
        if (editValue.data == '' || editValue.data == null){
            return 'payload';
        } else {
            return editValue.data.payload;
        }
    }
    const renderSetTable = () => (
        <div className={`image-modal ${canDrop && isOver ? 'upload-target' : ''}`}>
            <div className='side-by-side middle'>
                <div>
                    <b>Display label</b>&nbsp;&nbsp;
                    <Input
                    ref={tableRef}
                    autoFocus
                    placeholder="Text"
                    value={setText()}//
                    onChange={(e) => {e.preventDefault(); setModalOpen(true); setEditValue({data: {"text": e.target.value, "payload": payloadVal(editValue), "payload_type": setPayloadType()}, innerindex: editValue.innerindex, outerindex: editValue.outerindex}); updateText(e);}}
                    onKeyDown={handleKeyDown}
                    size='small'
                    data-cy='table-input'
                    className='table-input'
                    />&nbsp;&nbsp;
                    <b>Type</b>&nbsp;&nbsp;
                    <select className="ui dropdown" value={setPayloadType()} onChange={(e) => {e.preventDefault(); setEditValue({data: {"text": editValue.data.text, "payload": editValue.data.payload, "payload_type": e.target.value}, innerindex: editValue.innerindex, outerindex: editValue.outerindex}); updateType(e);}}>
                        <option value="text">Text</option>
                        <option value="payload">Payload</option>
                        <option value="url">Blank Url</option>
                        <option value="url_self">Self Url</option>
                    </select>
                    <br /><br />
                    {(setPayloadType() != 'text') ? ((setPayloadType() == 'payload') ? (
                        <>
                            <b>Payload</b>&nbsp;&nbsp;
                            <Input
                            ref={tableRef}
                            autoFocus
                            value={setPayload()}
                            onChange={(e) => {e.preventDefault(); setModalOpen(true); setEditValue({data: {"text": editValue.data.text, "payload": e.target.value, "payload_type": editValue.data.payload_type}, innerindex: editValue.innerindex, outerindex: editValue.outerindex}); updatePayload(e);}}
                            onKeyDown={handleKeyDown}
                            size='small'
                            data-cy='table-input'
                            className='table-input'
                            /><br /><br />
                        </>
                    ) : (<>
                            <b>Url</b>&nbsp;&nbsp;
                            <Input
                            ref={tableRef}
                            autoFocus
                            value={setPayload()}
                            onChange={(e) => {e.preventDefault(); setModalOpen(true); setEditValue({data: {"text": editValue.data.text, "payload": e.target.value, "payload_type": editValue.data.payload_type}, innerindex: editValue.innerindex, outerindex: editValue.outerindex}); updatePayload(e);}}
                            onKeyDown={handleKeyDown}
                            size='small'
                            data-cy='table-input'
                            className='table-input'
                            /><br /><br />
                        </>)) : <></>}
                    <i>Hint: Hit Enter (&crarr;) to save the value</i>
                    <Button style={{background: "transparent",position: "absolute",top: "-5px",right: "-25px"}} onClick={()=> setModalOpen(false)}><Icon name='close'/></Button>
                </div>
            </div>
        </div>
    );
    
    const renderTableHeader = () => {
        return (
            newheadings.map((headings, index) => {
            return <th
             key={index}
             onClick={(e) => { e.stopPropagation();  setModalOpen(true); setEditValue({headings: headings, outerindex: index}); renderSetTableHead();}}//renderSetTable
             {...defHeadStyle()}
             >
               {headings}
            </th>
          })
        )
      }
    
    const renderTableData = () => {
        return (rows.map((data, index) => {
          if(index < (newlimitrow ? newlimitrow : 5)) {
            return(
              <tr key={index}>
                {data.map((tdata, tindex) =>{
                    const { text, payload_type } = tdata
                    return (
                        <td
                        key={tindex}
                        {...defBodyStyle()} 
                        onClick={(e) => { e.stopPropagation(); setModalOpen(true); setEditValue({data: tdata, innerindex: tindex, outerindex: index}); renderSetTable();}}>
                        {text}
                        </td>
                    )
                })}
                <td>&nbsp;&nbsp;
                    <Icon style={{width:"22px",background:"#eceff1",color:"#b2bfc9", borderRadius: "5px"}} bordered name='trash' size='small' onClick={(e)=>{e.stopPropagation(); handleRemoveSpecificRow(index);}} />
                </td>
              </tr>
            )
          } else {
            return(
              <tr key={index} style={{display: viewtext ? 'none' : 'table-row'}}>
                {data.map((tdata, tindex) =>{
                    const { text, payload_type } = tdata
                    return (
                        <td
                        key={tindex}
                        {...defBodyStyle()}  
                        onClick={(e) => { e.stopPropagation(); setModalOpen(true); setEditValue({data: tdata, innerindex: tindex, outerindex: index}); renderSetTable();}}>
                        {text}
                        </td>
                    )
                })}
                <td>&nbsp;&nbsp;
                    <Icon style={{width:"22px",background:"#eceff1",color:"#b2bfc9", borderRadius: "5px"}} bordered name='trash' size='small' onClick={(e)=>{e.stopPropagation(); handleRemoveSpecificRow(index);}} />
                </td>
              </tr>
            )
          }   
        }))
      }
    
    const customButtonCssRow = {
        margin: "0",
        padding: "0",
        width: "auto",
        marginRight:"5px",
    }

    const customButtonCssColumn = {
        margin: "0",
        padding: "0",
        width: "auto",
    }

    const customButtonMain = {
        justifyContent: "flex-end",
        marginRight:"3px",
    }

    const showmoreRows = () => {
        if(viewtext == true) {
          setViewtext(false)
        } else {
          setViewtext(true)
        }
    };
    return (
            <Segment placeholder>
                <Grid columns={2} relaxed='very' stackable style={customButtonMain}>
                    <Grid.Column style={customButtonCssRow}>
                        <Button primary onClick={(e)=>{e.stopPropagation(); handleAddColum();}}>Add column</Button>
                    </Grid.Column>
                    <Grid.Column style={customButtonCssColumn}>
                        <Button primary onClick={(e)=>{e.stopPropagation(); handleAddRow();}}>Add row</Button>
                    </Grid.Column>
                </Grid>
                <Grid columns={1} relaxed='very' stackable style={{marginTop:"-5px"}}>
                    <Grid.Column>
                        <table id="tabledata" style={{border: "1px solid silver", width: "100%", marginTop: "10px", borderSpacing: "0"}}>
                            <tbody>
                            {newheadings ? <tr>
                                {renderTableHeader()}
                                <th style={{textAlign:"left"}}>
                                    <Icon style={{width:"22px",background:"#eceff1",color:"#b2bfc9", borderRadius: "5px", marginLeft:"6px"}} bordered name='trash' size='small' onClick={(e)=>{e.stopPropagation(); handleDeleteColum();}} />
                                </th>
                            </tr> : null}
                            {renderTableData()}
                            </tbody>
                        </table>
                        {((newlimitrow ? newlimitrow : 5) < (rows.length)) ? (
                            <button style={{float: "right", color: "white", background: "#1678C2", padding: "4px 6px", border: "0", borderRadius: "0 0 10px 10px"}}
                            onClick={(e) => { e.stopPropagation(); showmoreRows();}}>
                                View {viewtext? 'more' : 'less'}
                            </button>
                        ) : null }
                    </Grid.Column>
                    <Grid.Column>
                        <Grid columns={1} relaxed='very' stackable>
                            <Grid.Column>
                                <Form> 
                                    <div style={{fontWeight:"bold",fontSize: '16px', color: '#000', marginBottom: '10px'}}>Limit rows</div>
                                    <Input type='number' style={{width:'100%', margin: "0", textAlign: "left"}} placeholder='Set no. of rows limit' value={newlimitrow} onChange={(e) => {e.preventDefault(); setNewlimitrow(e.target.value);}}/>
                                </Form>
                            </Grid.Column>
                            <Grid.Column>
                                <Form> 
                                    <div style={{fontWeight:"bold",fontSize: '16px', color: '#000', marginBottom: '10px'}}>Headings style</div>
                                    <TextArea style={{maxWidth:'100%', margin: "0", textAlign: "left"}} placeholder='Set your styles in css' value={newheadStyle} onChange={(e) => {e.preventDefault(); setNewHeadStyle(e.target.value);}}/>
                                </Form>
                            </Grid.Column>
                            <Grid.Column>
                                <Form> 
                                    <div style={{fontWeight:"bold",fontSize: '16px', color: '#000', marginBottom: '10px'}}>Body style</div>
                                    <TextArea style={{maxWidth:'100%', margin: "0", textAlign: "left"}} placeholder='Set your styles in css' value={newbodystyle} onChange={(e) => {e.preventDefault(); setNewbodystyle(e.target.value);}}/>
                                </Form>
                            </Grid.Column>
                        </Grid>
                    </Grid.Column>
                </Grid>
                {modalOpen && (
                    <Modal
                        open
                        size='tiny'
                        onClose={setTableFromBox}
                        content={editValue ? (('headings' in editValue) ? renderSetTableHead : renderSetTable) : null}
                    />
                )}
            </Segment>
    );
}

TableThumbnail.propTypes = {
    onChange: PropTypes.func,
    data: PropTypes.array,
    type: PropTypes.string,
    stylehead: PropTypes.string,
    stylebody: PropTypes.string,
    limitrow: PropTypes.any,
    headings: PropTypes.array,
    editable: PropTypes.bool,
    otherActions: PropTypes.array,
    className: PropTypes.string,
};

TableThumbnail.defaultProps = {
    onChange: () => {},
    otherActions: [],
    editable: true,
    data: [],
    type: 'table',
    headings: [],
    limitrow: 5,
    stylehead: "border:1px solid silver;padding:8px;background:#000;color:#fff",
    stylebody: "border:1px solid silver;padding:8px;color:black",
    className: '',
};
