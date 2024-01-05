const express = require('express');
const axios = require('axios');
const mysql = require('mysql');

// Conexión a la base de datos MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'nueva_contraseña',
  database: 'agencia_viajes'
});

db.connect((err) => {
  if (err) { throw err; }
  console.log('Conectado a la base de datos MySQL');
});

const app = express();

app.use(express.json()); // Para poder manejar JSON en el cuerpo de las peticiones

// Endpoint que recibe un apellido y devuelve datos de georreferenciación
app.get('/geodata/:apellido', (req, res) => {
  const apellido = req.params.apellido;

  // Consulta la base de datos para obtener la ciudad asociada al apellido
  db.query('SELECT ciudad FROM clientes WHERE apellido = ?', [apellido], (err, result) => {
    if (err) throw err;

    // Si no se encuentra un cliente con ese apellido
    if (result.length === 0) {
      return res.status(404).send('Apellido no encontrado');
    }

    const ciudad = result[0].ciudad;
    console.log(result[0]);

    // Usa la ciudad para hacer la petición al API de Geocode.xyz
    axios.get(`https://geocode.xyz/${ciudad}?json=1`)
      .then(geoResponse => {
        
        const insertQuery = 'INSERT INTO geodata (ciudad, provincia, pais, codigo_postal, latitud, longitud) VALUES (?, ?, ?, ?, ?, ?)';
        const geodata = geoResponse.data;
        const values = [
          geodata.standard.city,
          geodata.standard.prov,
          geodata.standard.countryname,
          geodata.postal,
          geodata.latt,
          geodata.longt
        ];

        db.query(insertQuery, values, (insertErr, insertResult) => {
          if (insertErr) {
            console.error('Error al insertar datos de georreferenciación:', insertErr);
            return res.status(500).send('Error al guardar los datos de georreferenciación');
          }

          // Envía los datos de georreferenciación como respuesta
          res.json(geodata);
        });
      })
      .catch(geoError => {
        res.status(500).send('Error al obtener datos de georreferenciación');
      });
  });
});

// Inicia el servidor
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
