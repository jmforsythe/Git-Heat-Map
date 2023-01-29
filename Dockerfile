FROM python:3.10

WORKDIR /usr/src/app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# change to your repo here
RUN git clone https://github.com/jmforsythe/Git-Heat-Map.git
RUN sh generate-db.sh Git-Heat-Map # also change the name here

CMD [ "python", "./flask_app.py" ]
