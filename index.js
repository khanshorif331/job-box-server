require('dotenv').config()
const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const app = express()
const port = process.env.PORT || 5000

const cors = require('cors')

app.use(cors())
app.use(express.json())
// app.use((req, res, next) => {
// 	res.header('Access-Control-Allow-Origin', '*')
// 	next()
// })

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jtdcwel.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(uri, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
	serverApi: ServerApiVersion.v1,
})

const run = async () => {
	try {
		const db = client.db('job-box-server')
		const userCollection = db.collection('user')
		const jobCollection = db.collection('job')
		const chatCollection = db.collection('chat')
		console.log('Database connected')

		app.get('/users', async (req, res) => {
			const cursor = userCollection.find({})
			const result = await cursor.toArray()
			res.send({ status: true, data: result })
		})

		app.post('/user', async (req, res) => {
			const user = req.body

			const result = await userCollection.insertOne(user)

			res.send(result)
		})

		app.get('/user/:email', async (req, res) => {
			const email = req.params.email

			const result = await userCollection.findOne({ email })

			if (result?.email) {
				return res.send({ status: true, data: result })
			}

			res.send({ status: false })
		})

		app.patch('/apply', async (req, res) => {
			const userId = req.body.userId
			const jobId = req.body.jobId
			const email = req.body.email

			const filter = { _id: ObjectId(jobId) }
			const updateDoc = {
				$push: { applicants: { id: ObjectId(userId), email } },
			}

			const result = await jobCollection.updateOne(filter, updateDoc)

			if (result.acknowledged) {
				return res.send({ status: true, data: result })
			}

			res.send({ status: false })
		})

		app.patch('/query', async (req, res) => {
			const userId = req.body.userId
			const jobId = req.body.jobId
			const email = req.body.email
			const question = req.body.question

			const filter = { _id: ObjectId(jobId) }
			const updateDoc = {
				$push: {
					queries: {
						id: ObjectId(userId),
						email,
						question: question,
						reply: [],
					},
				},
			}

			const result = await jobCollection.updateOne(filter, updateDoc)

			if (result?.acknowledged) {
				return res.send({ status: true, data: result })
			}

			res.send({ status: false })
		})

		app.patch('/reply', async (req, res) => {
			const userId = req.body.userId
			const reply = req.body.reply

			const filter = { 'queries.id': ObjectId(userId) }

			const updateDoc = {
				$push: {
					'queries.$[user].reply': reply,
				},
			}
			const arrayFilter = {
				arrayFilters: [{ 'user.id': ObjectId(userId) }],
			}

			const result = await jobCollection.updateOne(
				filter,
				updateDoc,
				arrayFilter
			)
			if (result.acknowledged) {
				return res.send({ status: true, data: result })
			}

			res.send({ status: false })
		})

		app.get('/applied-jobs/:email', async (req, res) => {
			const email = req.params.email
			const query = { applicants: { $elemMatch: { email: email } } }
			const cursor = jobCollection.find(query).project({ applicants: 0 })
			const result = await cursor.toArray()

			res.send({ status: true, data: result })
		})

		app.get('/jobs', async (req, res) => {
			const cursor = jobCollection.find({})
			const result = await cursor.toArray()
			res.send({ status: true, data: result })
		})

		app.get('/job/:id', async (req, res) => {
			const id = req.params.id

			const result = await jobCollection.findOne({ _id: ObjectId(id) })
			res.send({ status: true, data: result })
		})

		app.post('/job', async (req, res) => {
			const job = req.body

			const result = await jobCollection.insertOne(job)

			res.send({ status: true, data: result })
		})
		app.get('/posted-jobs/:email', async (req, res) => {
			const email = req.params.email
			const cursor = await jobCollection.find({ email })
			const result = await cursor.toArray()

			res.send({ status: true, data: result })
		})

		// chat api

		// get chat by id
		app.get('/chat', async (req, res) => {
			const id = req.query.id
			const result = await chatCollection.findOne({ _id: ObjectId(id) })
			res.send({ status: true, data: result })
		})
		// get chats by email
		app.get('/chats', async (req, res) => {
			// from frontend query should be like--- chats?candidate=some@gmail.com or employer=me@gmail.com
			// email = {candidate:'ami@gmail.com'} or {employer:'me@c.com'}
			const email = req.query
			const cursor = await chatCollection.find(email)
			const result = await cursor.toArray()

			res.send({ status: true, data: result })
		})
		app.get('/chatConversation', async (req, res) => {
			const employer = req.query.employerEmail
			const candidate = req.query.candidateEmail
			const filter = {
				$and: [{ employer }, { candidate }],
			}

			const result = await chatCollection.findOne(filter)
			if (result.acknowledged) {
				return res.send({ status: true, data: result })
			}

			res.send({ status: false })
		})
		app.post('/chat', async (req, res) => {
			const chat = req.body

			const result = await chatCollection.insertOne(chat)

			res.send(result)
		})
		app.patch('/chat', async (req, res) => {
			const id = req.body.id
			const message = req.body.message
			const filter = { _id: ObjectId(id) }
			const updateDoc = {
				$push: {
					messages: message,
				},
			}

			const result = await chatCollection.updateOne(filter, updateDoc)
			if (result.acknowledged) {
				return res.send({ status: true, data: result })
			}

			res.send({ status: false })
		})
	} finally {
	}
}

run().catch(err => console.log(err))

app.get('/', (req, res) => {
	res.send('Welcome to JOBBOX server!')
})

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`)
})
