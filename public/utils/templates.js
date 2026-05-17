/**
 * templates.js — Default component object templates.
 * Pure data factory functions — no DOM, no state.
 */

const _SX = 1.7647058823529411;

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).substr(2, 5)}`;
}

function baseTransform(x, y, w, h, layerIndex) {
  return {
    x, y, width: w, height: h,
    layer_index: layerIndex,
    opacity: 1,
    raw: { width: w, height: h, scaleX: _SX, scaleY: _SX },
  };
}

/** Return a fresh default component object by type. */
export function createTemplate(componentType, layerIndex = 0) {
  const li = layerIndex;

  const templates = {
    Rectangle: () => ({
      id: uid('Rectangle'), component: 'Rectangle',
      transform: baseTransform(50, 50, 200, 100, li),
      radius_corner: 0,
      background: { background_color: '#6d1810', background_color_from_template: false },
      hover_color: '#6d1810', hover_opacity: 1, hover_color_from_template: false,
      parameter_source: 'menu', parameter_source_value: ''
    }),

    Image: () => ({
      id: uid('Image'), component: 'Image',
      transform: baseTransform(50, 50, 200, 150, li),
      source: 'media/img/', string_dynamic: null,
      parameter_source: 'menu', parameter_source_value: '',
      scale_type: 'center_crop', radius_corner: 0
    }),

    Text: () => ({
      id: uid('Text'), component: 'Text',
      transform: baseTransform(50, 50, 300, 50, li),
      text: 'New Text', text_align: 'left',
      font: { font_color: '#ffffff', font_size: 32, font_family: 'Roboto', font_weight: 'normal', font_style: 'normal' }
    }),

    TextDynamic: () => ({
      id: uid('TextDynamic'), component: 'TextDynamic',
      transform: baseTransform(50, 50, 300, 60, li),
      scroll_direction: 'Horizontal', scroll_speed: 100,
      parameter_source: 'menu', parameter_source_value: '',
      text: '%device/guestname%', text_align: 'left',
      font: { font_color: '#ffffff', font_size: 32, font_family: 'Roboto', font_opacity: 1, font_weight: 'normal', font_style: 'normal' }
    }),

    RunningText: () => ({
      id: uid('RunningText'), component: 'RunningText',
      transform: baseTransform(0, 1012, 1920, 41, li),
      scroll_speed: 100,
      font: { font_color: '#ffffff', font_size: 36, font_family: 'Roboto', font_weight: 'normal', font_style: 'normal' }
    }),

    Clock: () => ({
      id: uid('Clock'), component: 'Clock',
      transform: baseTransform(750, 50, 180, 81, li),
      text: '23:59', text_align: 'left',
      font: { font_color: '#ffffff', font_size: 72, font_family: 'Roboto', font_weight: 'bold', font_style: 'normal' },
      format: '24-hours',
    }),

    Date: () => ({
      id: uid('Date'), component: 'Date',
      transform: baseTransform(750, 131, 180, 36, li),
      text: '01 Jan 2023', text_align: 'left',
      font: { font_color: '#ffffff', font_size: 32, font_family: 'Helvetica', font_weight: 'normal', font_style: 'normal' },
      format: 'DD Mo YYYY', include_day_name: false,
    }),

    Weather: () => ({
      id: uid('Weather'), component: 'Weather',
      transform: baseTransform(1015, 56, 66, 66, li),
      background: { background_color: '#ffffff' },
    }),

    Temperature: () => ({
      id: uid('Temperature'), component: 'Temperature',
      transform: baseTransform(1013, 131, 77, 36, li),
      text: '23 °C', text_align: 'left',
      font: { font_color: '#ffffff', font_size: 32, font_family: 'Roboto', font_weight: 'normal', font_style: 'normal' },
    }),

    Video: () => ({
      id: uid('Video'), component: 'Video',
      transform: baseTransform(0, 0, 1920, 1080, li),
      source: 'media/video/', string_dynamic: null,
      is_streaming: 0, is_looping: '1', is_mute: '0',
      parameter_source: 'menu', parameter_source_value: ''
    }),

    Button: () => {
      const btnId = uid('Button');
      return {
        id: btnId, component: 'Button',
        transform: baseTransform(360, 750, 200, 200, li),
        group_id: btnId,
        menu: { dm_id: '', dm_name: '' },
        language: { lg_id: '1', lg_name: 'Indonesian' },
        is_enable_text: true, is_enable_image: true,
        scroll_x: true, scroll_y: true,
        action_id: 'open_menu',
        action_parameter: { menu: '', fixedMenu: '', categories: [], custom: '', app: '', image: '', channel: '', language: '1', gridOrder: '', url: '', appParamType: 'none' },
        is_action_compatible: true,
        parameter_source: 'menu', parameter_source_value: '',
        metadata: {
          groupId: btnId, layerIndex: li, dmId: '', dmName: '', lgId: '1', lgName: 'Indonesian',
          isEnableText: true, isEnableImage: true, scrollX: true, scrollY: true,
          actionId: 'open_menu',
          actionParameter: { menu: '', fixedMenu: '', categories: [], custom: '', app: '', image: '', channel: '', language: '1', gridOrder: '', url: '', appParamType: 'none' },
          isActionCompatible: true,
        },
        objects: [
          {
            id: uid('Button_Rectangle'), component: 'Button_Rectangle',
            transform: { x: 360, y: 750, width: 200, height: 200, layer_index: -1, opacity: 0, raw: { width: 200, height: 200, scaleX: _SX, scaleY: _SX } },
            background: { background_color: '#6d1810' }, hover_color: '#6d1810', hover_opacity: 1, radius_corner: 0.26,
          },
          {
            id: uid('Button_Image'), component: 'Button_Image',
            transform: { x: 405, y: 768, width: 113, height: 113, layer_index: -1, opacity: 1, raw: { width: 264, height: 264, scaleX: 0.75, scaleY: 0.75 } },
            source: 'media/icon/png/', string_dynamic: null, parameter_source: 'menu', parameter_source_value: ''
          },
          {
            id: uid('Button_Text'), component: 'Button_Text',
            transform: { x: 390, y: 900, width: 145, height: 32, layer_index: -1, opacity: 1, raw: { width: 145, height: 32, scaleX: _SX, scaleY: _SX } },
            text: 'Button', text_align: 'center',
            font: { font_color: '#ffffff', font_size: 28, font_family: 'Roboto', font_weight: 'normal', font_style: 'normal' }
          },
        ],
      };
    },

    ButtonGrid: () => {
      const gridId = uid('ButtonGrid');
      return {
        id: gridId, component: 'ButtonGrid',
        button_grid_id: gridId,
        transform: baseTransform(0, 150, 400, 695, li),
        order: 1,
        layout: 'fixed_column_only', horizontal_alignment: 'left', vertical_alignment: 'top',
        column: '1', row: 3,
        item_width: 399, item_height: 75,
        item_horizontal_gap: 10, item_vertical_gap: 5,
        scroll_horizontal_offset: 0, scroll_vertical_offset: 0,
        content_type: 'dining_items', parameter_source: 'button_grid', parameter_source_value: 1,
        item_data: '%dining/item%',
        item_config: {
          is_enable_name_text: true, is_enable_desc_text: false, is_enable_price_text: false,
          is_enable_qty_text: false, is_enable_qty_rect: false, is_enable_image: false,
          is_enable_text_1: false, is_enable_text_2: false, is_enable_text_3: false,
          string_name_text: '%dining/item/name%', string_desc_text: '%dining/item/description%',
          string_price_text: '%dining/item/price%', string_qty_text: '%dining/item/qty%',
          string_image: '%dining/item/image%',
          string_text_1: '', string_text_2: '', string_text_3: '',
        },
        item_component: {
          rectangle:  { transform: { x:0,  y:0,   width:399, height:75,  opacity:1, raw:{width:399,height:75,  scaleX:_SX,scaleY:_SX} }, background:{background_color:'#000000'}, hover_color_from_template:true,  hover_color:'#000000', hover_opacity:1, radius_corner:0 },
          name_text:  { transform: { x:30, y:19,  width:350, height:45,  opacity:1, raw:{width:350,height:45,  scaleX:_SX,scaleY:_SX} }, scroll_direction:'Horizontal', scroll_speed:100, text:'%dining/item/name%',        text_align:'left', font:{font_color:'#FFFFFF',font_size:32,font_family:'Helvetica',font_opacity:1,font_weight:'normal',font_style:'normal'} },
          desc_text:  { transform: { x:12, y:49,  width:280, height:26,  opacity:1, raw:{width:280,height:26,  scaleX:_SX,scaleY:_SX} }, scroll_direction:'Horizontal', scroll_speed:100, text:'%dining/item/description%',  text_align:'left', font:{font_color:'#FFFFFF',font_size:32,font_family:'Helvetica',font_opacity:1,font_weight:'normal',font_style:'normal'} },
          price_text: { transform: { x:12, y:49,  width:280, height:26,  opacity:1, raw:{width:280,height:26,  scaleX:_SX,scaleY:_SX} }, scroll_direction:'Horizontal', scroll_speed:100, text:'%dining/item/price%',        text_align:'left', font:{font_color:'#FFFFFF',font_size:32,font_family:'Helvetica',font_opacity:1,font_weight:'normal',font_style:'normal'} },
          qty_text:   { transform: { x:12, y:135, width:280, height:26,  opacity:1, raw:{width:280,height:26,  scaleX:_SX,scaleY:_SX} }, scroll_direction:'Horizontal', scroll_speed:100, text:'%dining/item/qty%',          text_align:'left', font:{font_color:'#FFFFFF',font_size:32,font_family:'Helvetica',font_opacity:1,font_weight:'normal',font_style:'normal'} },
          qty_rect:   { transform: { x:0,  y:0,   width:36,  height:36,  opacity:1, raw:{width:36, height:36,  scaleX:_SX,scaleY:_SX} }, background:{background_color:'#d27a0a'}, hover_color_from_template:false, hover_color:'#000000', hover_opacity:1, radius_corner:0 },
          image:      { transform: { x:100,y:0,   width:100, height:75,  opacity:1, raw:{width:100,height:75,  scaleX:_SX,scaleY:_SX} }, string_dynamic:'%dining/item/image%', radius_corner:0 },
          text_1:     { transform: { x:12, y:115, width:280, height:26,  opacity:1, raw:{width:280,height:26,  scaleX:_SX,scaleY:_SX} }, scroll_direction:'Horizontal', scroll_speed:100, text:'', text_align:'left', font:{font_color:'#FFFFFF',font_size:32,font_family:'Helvetica',font_opacity:1,font_weight:'normal',font_style:'normal'} },
          text_2:     { transform: { x:12, y:140, width:280, height:26,  opacity:1, raw:{width:280,height:26,  scaleX:_SX,scaleY:_SX} }, scroll_direction:'Horizontal', scroll_speed:100, text:'', text_align:'left', font:{font_color:'#FFFFFF',font_size:32,font_family:'Helvetica',font_opacity:1,font_weight:'normal',font_style:'normal'} },
          text_3:     { transform: { x:12, y:165, width:280, height:26,  opacity:1, raw:{width:280,height:26,  scaleX:_SX,scaleY:_SX} }, scroll_direction:'Horizontal', scroll_speed:100, text:'', text_align:'left', font:{font_color:'#FFFFFF',font_size:32,font_family:'Helvetica',font_opacity:1,font_weight:'normal',font_style:'normal'} },
        },
        action_id: 'none',
        action_parameter: { menu: '', gridOrder: '' },
      };
    },

    Slideshow: () => ({
      id: uid('Slideshow'),
      component: 'Slideshow',
      transform: baseTransform(400, 0, 1520, 840, li),
      show_time: 5,
      transition_time: 1,
      transition_effect: 'Simple',
      string_dynamic: '%slideshow/info%',
      slideshow_source: 'custom',
      parameter_source: 'button_grid',
      parameter_source_value: 1,
      controllable: false,
      background: { background_color: '#000000' },
      images: [
        "media/img/alana_gm.png", 
        "https://asset.kompas.com/crops/3xYktcut3GtTLSvS9iNgqM4e380=/0x0:1000x667/1200x800/data/photo/2023/05/06/645677f368fc1.jpg",
        "media/img/room3.png"
      ]
    }),
  };

  const factory = templates[componentType];
  if (!factory) {
    // Fallback: generic unknown component
    return {
      id: uid(componentType), component: componentType,
      transform: baseTransform(50, 50, 200, 100, layerIndex)
    };
  }

  const obj = factory();

  // Auto-set self-referencing ID fields
  if (obj.button_grid_id !== undefined) obj.button_grid_id = obj.id;
  if (obj.group_id !== undefined) obj.group_id = obj.id;
  if (obj.metadata?.groupId !== undefined) obj.metadata.groupId = obj.id;
  if (obj.metadata?.textDynamicId !== undefined) obj.metadata.textDynamicId = obj.id;

  return obj;
}

/** All supported component type names. */
export const COMPONENT_TYPES = [
  'Rectangle', 'Image', 'Text', 'TextDynamic', 'RunningText',
  'Clock', 'Date', 'Weather', 'Temperature', 'Video',
  'Button', 'ButtonGrid', 'Slideshow'
];