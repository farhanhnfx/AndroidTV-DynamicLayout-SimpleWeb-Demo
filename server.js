// const express = require('express');
// const path = require('path');

// const start = require('./data/start.json');
// const welcome = require('./data/welcome.json');
// const home = require('./data/home.json');
// const dining = require('./data/dining.json')
// const hotelinfo = require('./data/hotelinfo.json')
// const greetings = require('./data/gm_greeting.json')

// const menu = require('./data/menu.json');
// const roomlist = require('./data/roomlist.json');

// const diningItems = require('./data/grid/dining_items.json')
// const diningCategories = require('./data/grid/dining_categories.json')
// const hotelInfoItems = require('./data/grid/info_items.json')

// const app = express();
// const HOSTNAME = "192.168.100.56"
// const PORT = 3000;

// app.use(express.static(path.join(__dirname, 'public')));

// const layout = {
//   "status": true,
//   "results": {
//     "layout": [start, welcome, home, dining, hotelinfo, greetings]
//   }
// } 

// app.get('/api/start-page', (req, res) => {
//   res.json(start);
// });

// app.get('/api/welcome-page', (req, res) => {
//   res.json(welcome);
// });

// app.get('/api/home-page', (req, res) => {
//   res.json(home);
// });

// app.get('/api/layout', (req, res) => {
//   res.json(layout);
// });

// app.get('/api/menu', (req, res) => {
//   res.json(menu);
// })

// app.get('/api/room-list', (req, res) => {
//   res.json(roomlist);
// })

// app.get('/api/room-list/:device', (req, res) => {
//   const { device } = req.params;

//   const rooms = roomlist?.results?.room_list || [];

//   const room = rooms.find(r => r.device == device);

//   return res.status(room ? 200 : 404).json({
//     status: true,
//     message: room ? undefined : 'Device not found',
//     results: {
//       room_list: room ? [room] : []
//     }
//   });
// });

// app.get('/api/items/:content_type', (req, res) => {
//   const { content_type } = req.params;
//   let items = []
//   if (content_type == 'dining_items') {
//     items = diningItems.items
//   }
//   else if (content_type == 'dining_categories') {
//     items = diningCategories.items
//   }
//   else if (content_type == 'info_items') {
//     items = hotelInfoItems.items
//   }

//   return res.status( items ? 200: 404 ).json({
//     status: true,
//     message: 'Dining Items Information',
//     results: {
//       items
//     }
//   })
// })

// // Serve static media folder
// app.use('/media', express.static(path.join(__dirname, 'media')));

// // app.listen(PORT, () => {
// //   console.log(`Server running at port:${PORT}`);
// // });

// app.listen(PORT, HOSTNAME, () => {
//   console.log(`Server running at ${HOSTNAME}:${PORT}`);
// });


const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const HOSTNAME = "192.168.100.56";
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use('/media', express.static(path.join(__dirname, 'media')));
app.use(express.json({ limit: '50mb' })); // Limit diperbesar untuk menampung banyak scene

// Helper untuk membaca & menulis JSON
const readJson = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
        return null;
    } catch (err) {
        console.error(`Gagal membaca ${filePath}:`, err.message);
        return null;
    }
};

const writeJson = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
};

// ==========================================
// ENDPOINT INISIALISASI (FRONTEND VISUALIZER)
// ==========================================
let combinedLayouts = {};
let fileMappingCache = {}; // Objek terpisah untuk menyimpan mapping nama file

app.get('/api/master-layouts', (req, res) => {
    const dataDir = path.join(__dirname, 'data');
    combinedLayouts = {};
    fileMappingCache = {};

    try {
        const files = fs.readdirSync(dataDir);
        
        files.forEach(file => {
            if (
                file.endsWith('.json') && 
                file !== 'master_layouts.json' &&
                file !== 'menu.json' &&
                file !== 'roomlist.json'
            ) {
                const filePath = path.join(dataDir, file);
                const fileContent = fs.readFileSync(filePath, 'utf8');
                
                try {
                    const jsonData = JSON.parse(fileContent);
                    let layoutData = jsonData;
                    if (jsonData.results && Array.isArray(jsonData.results.layout)) {
                        layoutData = jsonData.results.layout[0];
                    }

                    if (layoutData && layoutData.dm_id) {
                        combinedLayouts[layoutData.dm_id] = layoutData;
                        
                        // [BARU] Simpan mapping file di luar objek layout aslinya
                        fileMappingCache[layoutData.dm_id] = file;
                    }
                } catch (parseError) {
                    console.warn(`[Warning] Gagal parsing JSON di file: ${file}`);
                }
            }
        });

        // Kirimkan data layout dan file mapping secara terpisah
        res.json({
            status: true,
            results: {
                layout: Object.values(combinedLayouts),
                file_mapping: fileMappingCache
            }
        });
    } catch (error) {
        console.error("Error membaca direktori data:", error);
        res.status(500).json({ error: "Gagal membaca direktori data" });
    }
});

app.get('/api/layout', (req, res) => {
    res.json({ status: true, results: { layout: Object.values(combinedLayouts) } });
});

app.get('/api/menu', (req, res) => {
    const menu = readJson(path.join(__dirname, 'data/menu.json'));
    return res.json(menu || []);
});

const gridDataDir = path.join(__dirname, 'data/grid');

// Pastikan folder data/grid tersedia
if (!fs.existsSync(gridDataDir)) {
    fs.mkdirSync(gridDataDir, { recursive: true });
}

// 1. GET Semua Daftar Tipe Konten (Membaca nama file di folder grid)
app.get('/api/content-types', (req, res) => {
    try {
        const files = fs.readdirSync(gridDataDir);
        const types = files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
        res.json({ status: true, types: types.length > 0 ? types : ['dining_items'] });
    } catch (err) {
        res.json({ status: true, types: ['dining_items'] });
    }
});

// 2. GET Data Item Spesifik (Read)
app.get('/api/items/:content_type', (req, res) => {
    const { content_type } = req.params;
    const filePath = path.join(gridDataDir, `${content_type}.json`);
    
    let items = [];
    if (fs.existsSync(filePath)) {
        try {
            const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            items = fileData?.items || [];
        } catch (e) {
            console.error('Gagal membaca data grid:', e.message);
        }
    }

    return res.status(200).json({
        status: true,
        message: `${content_type} Information`,
        results: { items }
    });
});

// 3. POST Simpan Data Item (Create, Update, Delete)
app.post('/api/items/:content_type', (req, res) => {
    const { content_type } = req.params;
    const filePath = path.join(gridDataDir, `${content_type}.json`);
    
    try {
        // Ambil array items dari body, format sesuai standar Android TV
        const dataToSave = { items: req.body.items || [] };
        fs.writeFileSync(filePath, JSON.stringify(dataToSave, null, 2), 'utf8');
        
        return res.status(200).json({ status: true, message: 'Data API berhasil disimpan!' });
    } catch (error) {
        return res.status(500).json({ status: false, message: 'Gagal menyimpan data API.' });
    }
});

// ==========================================
// ENDPOINT PENYIMPANAN
// ==========================================

app.post('/api/save-config', (req, res) => {
    // Menerima file_mapping terpisah dari frontend
    const { menus, layouts, file_mapping } = req.body;

    try {
        if (menus) {
            writeJson(path.join(__dirname, 'data/menu.json'), menus);
        }
        
        if (layouts) {
            const layoutsData = Array.isArray(layouts) 
                ? layouts.reduce((acc, curr) => ({ ...acc, [curr.dm_id]: curr }), {})
                : layouts;

            // 1. Simpan master kompilasi (bersih dari file_name)
            writeJson(path.join(__dirname, 'data/master_layouts.json'), layoutsData);

            // 2. Ekstrak dan simpan menggunakan kamus mapping
            Object.keys(layoutsData).forEach(dmId => {
                const scene = layoutsData[dmId];
                
                // Pastikan properti 'file_name' terhapus jika sebelumnya sempat tersimpan tak sengaja
                if (scene.file_name !== undefined) delete scene.file_name;
                
                let fileName = '';
                // Gunakan mapping yang dikirim dari frontend jika ada
                if (file_mapping && file_mapping[dmId] && file_mapping[dmId].trim() !== '') {
                    fileName = file_mapping[dmId];
                    fileName = fileName.replace(/[^a-z0-9_.-]/gi, '').toLowerCase(); 
                    if (!fileName.endsWith('.json')) fileName += '.json';
                } else {
                    const safeName = (scene.layout_name || `scene_${dmId}`).replace(/[^a-z0-9_]/gi, '_').toLowerCase();
                    fileName = `${safeName}.json`;
                }
                
                writeJson(path.join(__dirname, 'data', fileName), scene);
            });
        }

        res.status(200).json({ status: true, message: "Konfigurasi dan individual scene berhasil disimpan secara bersih" });
    } catch (error) {
        res.status(500).json({ status: false, message: "Gagal menyimpan", error: error.message });
    }
});

// Endpoint untuk client Android TV mengambil layout berdasarkan dm_id
app.get('/api/layout/:dm_id', (req, res) => {
    const { dm_id } = req.params;
    const allLayouts = readJson(path.join(__dirname, 'data/master_layouts.json')) || {};
    const layout = allLayouts[dm_id];
    
    if (layout) {
        res.status(200).json({ status: true, results: { layout: [layout] } });
    } else {
        res.status(404).json({ status: false, message: "Layout tidak ditemukan" });
    }
});

const roomlist = require('./data/roomlist.json');
app.get('/api/room-list', (req, res) => {
  res.json(roomlist);
})

app.get('/api/room-list/:device', (req, res) => {
  const { device } = req.params;

  const rooms = roomlist?.results?.room_list || [];

  const room = rooms.find(r => r.device == device);

  return res.status(room ? 200 : 404).json({
    status: true,
    message: room ? undefined : 'Device not found',
    results: {
      room_list: room ? [room] : []
    }
  });
});

const ROOMLIST_PATH = path.join(__dirname, './data/roomlist.json');
// Helper: tulis ulang file roomlist.json
function writeRoomList(roomList) {
  const payload = {
    status: true,
    results: { room_list: roomList }
  };
  fs.writeFileSync(ROOMLIST_PATH, JSON.stringify(payload, null, 2), 'utf-8');
}
 
// POST /api/room-list — simpan seluruh list (bulk save / create)
app.post('/api/room-list', (req, res) => {
  try {
    const incoming = req.body?.results?.room_list;
    if (!Array.isArray(incoming)) {
      return res.status(400).json({ status: false, message: 'Invalid payload: results.room_list harus array' });
    }
    writeRoomList(incoming);
    roomlist.results.room_list = incoming; // update in-memory
    res.json({ status: true, message: 'Room list saved' });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
});
 
// POST /api/room-list/:device — update atau insert satu entry
app.post('/api/room-list/:device', (req, res) => {
  try {
    const { device } = req.params;
    const entry = req.body;
    if (!entry?.device) {
      return res.status(400).json({ status: false, message: 'Field device wajib diisi' });
    }
    const rooms = roomlist?.results?.room_list || [];
    const idx = rooms.findIndex(r => r.device === device);
    if (idx !== -1) {
      rooms[idx] = entry; // update
    } else {
      rooms.push(entry);  // insert baru
    }
    writeRoomList(rooms);
    res.json({ status: true, message: idx !== -1 ? 'Device updated' : 'Device created' });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
});
 
// DELETE /api/room-list/:device — hapus satu entry
app.delete('/api/room-list/:device', (req, res) => {
  try {
    const { device } = req.params;
    const rooms = roomlist?.results?.room_list || [];
    const idx = rooms.findIndex(r => r.device === device);
    if (idx === -1) {
      return res.status(404).json({ status: false, message: 'Device not found' });
    }
    rooms.splice(idx, 1);
    writeRoomList(rooms);
    res.json({ status: true, message: 'Device deleted' });
  } catch (e) {
    res.status(500).json({ status: false, message: e.message });
  }
});


app.listen(PORT, HOSTNAME, () => {
    console.log(`Server running at http://${HOSTNAME}:${PORT}`);
});