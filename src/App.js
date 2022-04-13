import './App.css';
import React from 'react';

// global variables to change where necessary
const DROPDOWN_API_ENDPOINT = 'https://cpv63w0p27.execute-api.us-east-1.amazonaws.com/prod/'; // TODO
const ML_API_ENDPOINT = 'https://oh0ld9alb2.execute-api.us-east-1.amazonaws.com/prod/'; // TODO


// atob is deprecated but this function converts base64string to text string
const decodeFileBase64 = (base64String) => {
  // From Bytestream to Percent-encoding to Original string
  return decodeURIComponent(
    atob(base64String).split("").map(function (c) {
      return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
    }).join("")
  );
};


function App() {
  const [inputFileData, setInputFileData] = React.useState(''); // represented as bytes data (string)
  const [outputFileData, setOutputFileData] = React.useState(''); // represented as readable data (text string)
  const [inputImage, setInputImage] = React.useState(''); // represented as bytes data (string)
  const [buttonDisable, setButtonDisable] = React.useState(true);
  const [submitButtonText, setSubmitButtonText] = React.useState('Submit');
  const [fileButtonText, setFileButtonText] = React.useState('Upload File');
  const [demoDropdownFiles, setDemoDropdownFiles] = React.useState([]);
  const [selectedDropdownFile, setSelectedDropdownFile] = React.useState('');
  // self defined
  const [predictionData, setPredictionData] = React.useState(''); // represented as readable data (text string)
  const [relationData, setRelationData] = React.useState(''); // represented as readable data (text string)


  // make GET request to get demo files on load -- takes a second to load
  React.useEffect(() => {
    fetch(DROPDOWN_API_ENDPOINT)
    .then(response => response.json())
    .then(data => {
      // GET request error
      if (data.statusCode === 400) {
        console.log('Sorry! There was an error, the demo files are currently unavailable.')
      }

      // GET request success
      else {
        const s3BucketFiles = JSON.parse(data.body);
        setDemoDropdownFiles(s3BucketFiles["s3Files"]);
      }
    });
  }, [])


  // convert file to bytes data
  const convertFileToBytes = (inputFile) => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(inputFile); // reads file as bytes data

      fileReader.onload = () => {
        resolve(fileReader.result);
      };

      fileReader.onerror = (error) => {
        reject(error);
      };
    });
  }


  // handle file input
  const handleChange = async (event) => {
    // Clear output text.
    setOutputFileData("");
    setPredictionData("");
    setRelationData("");

    const inputFile = event.target.files[0];

    // update file button text
    setFileButtonText(inputFile.name);

    // convert file to bytes data
    const base64Data = await convertFileToBytes(inputFile);
    setInputImage(base64Data);
    const base64DataArray = base64Data.split('base64,'); // need to get rid of 'data:image/png;base64,' at the beginning of encoded string
    const encodedString = base64DataArray[1];
    setInputFileData(encodedString);

    // enable submit button
    setButtonDisable(false);

    // clear response results
    setOutputFileData('');

    // reset demo dropdown selection
    setSelectedDropdownFile('');
  }


  // handle file submission
  const handleSubmit = (event) => {
    event.preventDefault();

    // temporarily disable submit button
    setButtonDisable(true);
    setSubmitButtonText('Loading Result...');

    // make POST request
    fetch(ML_API_ENDPOINT, {
      method: 'POST',
      headers: { "Content-Type": "application/json", "Accept": "text/plain" },
      body: JSON.stringify({ "image": inputFileData })
    }).then(response => response.json())
    .then(data => {
      // POST request error
      if (data.statusCode === 400) {
        const outputErrorMessage = JSON.parse(data.errorMessage)['outputResultsData'];
        setOutputFileData(outputErrorMessage);
      }

      // POST request success
      else {
        // CHANGED!!!
        let predictionData = JSON.parse(data.body)['outputPredictionData'];
        predictionData = "data:image/png;base64,".concat(predictionData);
        setPredictionData(predictionData);
        let relationData = JSON.parse(data.body)['outputRelationData'];
        relationData = "data:image/png;base64,".concat(relationData);
        setRelationData(relationData);
      }

      // re-enable submit button
      setButtonDisable(false);
      setSubmitButtonText('Submit');
    })
  }


  // handle demo dropdown file selection
  const handleDropdown = (event) => {
    setSelectedDropdownFile(event.target.value);

    // temporarily disable submit button
    setButtonDisable(true);
    setSubmitButtonText('Loading Demo File...');

    // only make POST request on file selection
    if (event.target.value) {
      fetch(DROPDOWN_API_ENDPOINT, {
        method: 'POST',
        body: JSON.stringify({ "fileName": event.target.value })
      }).then(response => response.json())
      .then(data => {

        // POST request error
        if (data.statusCode === 400) {
          console.log('Uh oh! There was an error retrieving the dropdown file from the S3 bucket.')
        }

        // POST request success
        else {
          const dropdownFileBytesData = JSON.parse(data.body)['bytesData'];
          setInputFileData(dropdownFileBytesData);
          setInputImage('data:image/png;base64,' + dropdownFileBytesData); // hacky way of setting image from bytes data - even works on .jpeg lol
          setSubmitButtonText('Submit');
          setButtonDisable(false);
        }
      });
    }

    else {
      setInputFileData('');
    }
  }


  return (
    <div className="App">
      <div className="Input">
        <h1>Stock Prediction</h1>
        <h2>Name:Yichen Li, email:liyichen@umich.edu</h2>
        <h1 align="left">Input</h1>
        <p align="left">
          Please upload a .csv file with content as following:<br />
          "attribute": open, low, high, close, volume<br />
          "target": AMD, AMZN, GOOG, IBM, IT, JPM, NFLX, WAT, WM, ZION<br />
          <br/>
          Or, please see the demo sample files by browsing the dropdown menu to see prepared sample files.
          And the content in the files are also shown in the filenames accordingly.<br />
        </p>
        <label htmlFor="demo-dropdown">Demo: </label>
        <select name="Select Image" id="demo-dropdown" value={selectedDropdownFile} onChange={handleDropdown}>
            <option value="">-- Select Demo File --</option>
            {demoDropdownFiles.map((file) => <option key={file} value={file}>{file}</option>)}
        </select>
        <form onSubmit={handleSubmit}>
          <label htmlFor="file-upload">{fileButtonText}</label>
          <input type="file" id="file-upload" onChange={handleChange} />
          <button type="submit" disabled={buttonDisable}>{submitButtonText}</button>
        </form>
        <img src={inputImage} alt="" />
      </div>
      <div className="Output">
        <h1 align="left">Results</h1>
        <h2 align="left">Relation</h2>
        <p align="left">
          This chart reveals the relationship between stocks mentioned in "targets" above, with the same sort<br />
          Having the default (best) history investigation length of 120 trading days.
        </p>
        <img src={predictionData} height="200"></img>
        <h2 align="left">Prediction</h2>
        <p align="left">
          This chart reveals the prediciton based on LSTM and LSTM with GreyRelationship calibration.<br />
          The prediciton part is set automatically 120 trading days after the querying day (today), 
          for the application currently using prediciton result from previous LSTM and calibration,
          so the longer the querying day is, the worse the prediction effect and accuracy will be. 
          As the test goes on, I think 120 timestamp, that is, the prediction accuracy of 120 trading days, 
          is acceptable.<br />
          Here by showing the slice of the history (training) data and 120 days prediciton result.<br /> 
        </p>
        <img src={relationData} height="200"></img>
      </div>
      <footer id="footer" class="wrapper style1-alt">
        <div class="inner">
          <p align="">
            If you want to know how it works, please use this link to see my technical report about this application
          </p>
          <a herf="https://issuu.com/liyichen_umich/docs/technical_report">
            Technical report
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;