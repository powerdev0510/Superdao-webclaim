var TOKEN_ADDRESS = "",
    TOKEN_DISCOUNT_PRICE = "...",//Value in Ether
    accounts = [],
    ethinterface,
    tokenContract,
    tokenInstance,
    claimedUnits,
    claimedPrepaidUnits,
    promissoryUnits = 3000000,
    isblinking;

const ERR_ACCOUNT_IS_LOCKED = 'Error: account is locked',
      ERR_NO_ACCOUNTS = 'No accounts available. Please, create or unlock your account and refresh the page.',
      ERR_PERSONAL_NOT_AVAILABLE = 'Error: The method personal_unlockAccount does not exist/is not available',
      ERR_NO_METAMASK = 'Metamask is recommened for use. Security!!!',
      ERR_NO_WEB3 = "Web3 not available.";

  window.addEventListener('load', function () {
    // Checking if Web3 has been injected by the browser (Mist/MetaMask)
    window = typeof window == 'undefined'?{}:window;
    global = typeof global == 'undefined'?{}:global;
    web3 = window.web3 || global.web3;
    if (typeof web3 !== 'undefined') {
      // Use Mist/MetaMask's provider
      window.web3 = new Web3(Web3.givenProvider || web3.currentProvider);
    } else {
      console.log('No web3? You should consider trying MetaMask!');
      notify.note(ERR_NO_METAMASK,'warning');
      // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
      window.web3 = new Web3(
        new Web3.providers.HttpProvider("http://localhost:8545"));
    }
    //console.log(web3.version)
    // Now you can start your app & access web3 freely:
    startApp();
    loadMarquee();
  });

  function loadMarquee(){
   $('.marquee').marquee({
     //If you wish to always animate using jQuery
     allowCss3Support: true,
     //works when allowCss3Support is set to true - for full list see http://www.w3.org/TR/2013/WD-css3-transitions-20131119/#transition-timing-function
     css3easing: 'linear',
     //requires jQuery easing plugin. Default is 'linear'
     easing: 'linear',
     //pause time before the next animation turn in milliseconds
     delayBeforeStart: 0,
     //'left', 'right', 'up' or 'down'
     direction: 'left',
     //true or false - should the marquee be duplicated to show an effect of continues flow
     duplicated: true,
     //speed in milliseconds of the marquee in milliseconds
     duration: 10000,
     //gap in pixels between the tickers
     gap: 20,
     //on cycle pause the marquee
     pauseOnCycle: false,
     //on hover pause the marquee - using jQuery plugin https://github.com/tobia/Pause
     pauseOnHover: true,
     //the marquee is visible initially positioned next to the border towards it will be moving
     startVisible: false
   });
  }

  function startApp() {

    ethinterface = new ethers.Interface( config.abi );

    if(!web3.isConnected())
      notify.show('Fetching data from Etherscan API','info');

    if (typeof web3 !== "undefined" && web3 instanceof Web3) {
      //Ensure we are on the right network
      web3.version.getNetwork(function (err, netId) {
        switch (netId) {
          case "1":
            console.log('This is mainnet');
            break;
          case "2":
            console.log(
              'This is the deprecated Morden test network.');
            break;
          case "3":
            console.log('This is the ropsten test network.');
            break;
          default:
            console.log('This is an unknown network.');
        }
        if (netId !== "1") {
          disable_button();
          notify.note(
            "Kindly switch to the Main Ethereum network, then refresh the page to claim Tokens.",
          'warning');
          return;
        }
        loadContract(netId)
      });

    } else {
      disable_button();
      notify.note(ERR_NO_WEB3,'error');
      //alert(ERR_NO_WEB3);
    }

    refresh_values();
    setInterval(
      function () {
        refresh_values();
      }, 15000);

    $('#claim_value').on('input', function () {
      var
        _value = this.value,
        tokens = Math.floor(_value / TOKEN_DISCOUNT_PRICE),
        tokenLeft = promissoryUnits-claimedUnits-claimedPrepaidUnits;

        if(tokens > tokenLeft){
          tokens = tokenLeft;
          var maxeth = tokens*TOKEN_DISCOUNT_PRICE
          $('#claim_value').val(maxeth)
        }

        $('#claim_button').text('Claim [' + tokens + '] Tokens');
    });
  }

  var getAddresses = function(accounts_count){
      accounts_count = typeof web3.eth.accounts == 'object'?web3.eth.accounts.length:0

      if (accounts_count === 0) {
        notify.note(ERR_NO_ACCOUNTS,'info');
        //add_to_log(ERR_NO_ACCOUNTS);
        disable_button();
        return;
      }

      var $accounts = $('#eth_accounts');
      for (var i = 0; i < accounts_count; i++) {
        accounts.push(web3.eth.accounts[i]);
      }

      $accounts.val(accounts[0]);
      $accounts.autocomplete({
          source: accounts,
          minLength: 0,
          scroll: true
      }).focus(function() {
          $(this).autocomplete("search", "");
      });

      getAddressBalance();
  }

  var loadContract = function(network){
    if(network == '1')
    try {
      accounts_count = web3.eth.accounts.length;
      tokenContract = web3.eth.contract(config.abi);
      tokenInstance = tokenContract.at(config.address);
      enable_button();
      notify.note('Successfully connected to Contract: <b style="font-weight: 700;">'+config.address+'</b>','success');
      log_events(tokenInstance);
    } catch (e) {
      console.log(e);
      disable_button();
      notify.note(
        'Cannot initiate token contract instance. Please, make sure your node has RPC available.','error');
        //add_to_log('Error: cannot initiate token contract instance.','error');
        return;
    }
    getAddresses();
  }

  var roundPrecise = function (number, precision) {
    var factor = Math.pow(10, precision);
    var tempNumber = number * factor;
    var roundedTempNumber = Math.round(tempNumber);
    return roundedTempNumber / factor;
  };

  function getFunctionSignature(fnx){
    return web3.sha3(fnx).substring(0,10);
  }

  function getGasPrice(){
    web3.eth.getGasPrice(function(e,r){

      if(e)
        return false;
      var gas = web3.fromWei( r , 'gwei');
      $('#gas_price').val(gas+' GWEI')
    })
  }

  function getAddressBalance(){
    var addressbox = $('#eth_accounts'),
    address = addressbox.val(),
    balbox = $('#tokn_bal');

    if(!web3.isAddress(address )){
      balbox.text('...');
      return;
    }

    function fetchNext(){
      tokenInstance.checkBalance.call(address,index,{from:address},function(e,r){
        if(e)
          return alert('Unable to fetch Token balance');
        if(Number(r[1]) > 0)
          claimed.push(r[1]);
        empty = r[4] == false;
        if(!empty){
          index++;
          fetchNext();}
        else{
          var total = claimed.reduce(function add(a, b) {
            return Number(a) + Number(b);
          },0);
          var discPrice = (prices.tkn_prc*prices.usd_btc*prices.btc_eth),
          usd = (total*discPrice);
          balbox.text(total.toLocaleString()+ ' SUP [ '+usd.toLocaleString([],{style:'currency',currency:'USD',maximumFractionDigits:2})+' ]')
        }
      });
    }

    function fetchNextApi(){
      var
      checkBalanceInfo = ethinterface.functions.checkBalance(address,index),
      cBdata = checkBalanceInfo.data;

      $.post(config.apiaddress,{
        action:"eth_call",
        apikey:config.apikey,
        module:"proxy",
        to:config.address,
        data:cBdata,//ensure values treated as strings
        })
        .then(function(d,e){
          if(e !== 'success')
            return;

          d = d.result;

          if(d !=='0x'){
            var r = checkBalanceInfo.parse(d),
            found = r[1].toString(10);

            if(Number(found) > 0)
              claimed.push(found);
            empty = r[4] == false;
          }
          else
            empty = true;

          if(!empty){
            index++;
            fetchNextApi();}
          else{

            var total = claimed.reduce(function add(a, b) {
              return Number(a) + Number(b);
            },0);
            var discPrice = (prices.tkn_prc*prices.usd_btc*prices.btc_eth),
            usd = (total*discPrice);
            balbox.text(total.toLocaleString()+ ' SUP [ '+usd.toLocaleString([],{style:'currency',currency:'USD',maximumFractionDigits:2})+' ]')
          }
        })
    }

    var empty=false,
    index=0,claimed=[];
    balbox.text('...');
    if(typeof tokenInstance != 'undefined')
      fetchNext();
    else
      fetchNextApi();
  }

  function fetchContractData(){
    var claimedPrepaidUnitsInfo = ethinterface.functions.claimedPrepaidUnits();
    claimedPrepaidUnits = claimedUnits = 0;
    return $.post(config.apiaddress,{
      action:"eth_call",
      apikey:config.apikey,
      module:"proxy",
      to:config.address,
      data:claimedPrepaidUnitsInfo.data,
      })
          .then(function(d,e){
              if(e != 'success')
                return;

              claimedPrepaidUnits = web3.toDecimal(d.result);
              //console.log("claimed prepaid",claimedPrepaidUnits);
          })
          .then(function(){
            var claimedUnitsInfo = ethinterface.functions.claimedUnits();
            return $.post(config.apiaddress,{
              action:"eth_call",
              apikey:config.apikey,
              module:"proxy",
              to:config.address,
              data:claimedUnitsInfo.data,
            })
            .then(function(d,e){
                if(e != 'success')
                  return;
                claimedUnits = web3.toDecimal(d.result);
                //console.log("claimed",claimedUnits);
            })
          })
  }

  function claim() {
    if (!tokenInstance) {
      return;
    }
    var
      transactionId,
      _gasPrice = +$('#gas_price').val(),
      _value = +$('#claim_value').val(),
      tokenCountCheck = roundPrecise(_value % TOKEN_DISCOUNT_PRICE, 11);
    if(!(_value > 0))return;//Ensure at least one token is bought
    if (tokenCountCheck !== TOKEN_DISCOUNT_PRICE) {
      _value = roundPrecise(_value - tokenCountCheck, 11);
      $('#claim_value').val(_value);
    }
    if (_value === 0) {
      return;
    }
    var found = new RegExp(/(\d)+/,'i').exec(_gasPrice),
    gas = found&& found.length>0?found[0]:0;

    disable_button();
    var options = {
      from: $('#eth_accounts').val(),
      value: web3.toWei(_value, 'ether')
    }
    if(Number(gas) > 0)
        options.gasPrice = web3.toWei(gas,'GWEI');

    try {
      transactionId = tokenInstance.claim(options,
       function (error, result) {
        if (!error) {
          _value = +$('#claim_value').val("");
          notify.note('Transaction sent: <a href="https://etherscan.io/tx/'
            + result + '" target="_blank">' + result + '</a>','success');
          //add_to_log('Transaction sent: <a href="https://etherscan.io/tx/'
          //  + result + '" target="_blank">' + result + '</a>');
        } else {
          error = error.toString();
          console.log(error);
          if (Object.keys(error)) {
            if (error.indexOf('Error: Error:') > -1) {
              error = error.substring(13);
              if (error.length > 58) {
                error = error.substring(0, 58) + "...";
              }
            }
            notify.note( error,'error');
          //  add_to_log('<span style="color:red">' + error
          //    + '</span>');
          }
        }
        refresh_values();
        enable_button();
      })
    } catch (e) {
      console.log("Excep:", e);
      notify.note( e.message ,'error');
      //add_to_log('<span style="color:red">' + e.message + '</span>');
      enable_button();
    }
  }
  function add_to_log(text) {
    $('#eth_log').append($('<div>').html(text).addClass('log_row'));
  }
  function log_events(contractInstance) {
    var events = contractInstance.TokensClaimedEvent({
      fromBlock: 'latest'
    });
    events.watch(function (error, event) {
      if (!error) {
        console.log(event);
        var
          event_name = 'Event ' + event.event,
          event_args = [];
        if (event.args.length !== 0) {
          for (var arg_name in event.args) {
            event_args.push(arg_name + ':' + event.args[arg_name]);
          }
        }
        console.log(event_name + '(' + event_args.join(',') + ')');
      }
    });
  }
  function disable_button() {
    $("#claim_button").prop('disabled', true);
    console.log('do disable')
  }
  function enable_button() {
    $("#claim_button").prop('disabled', false);
    console.log('do enable')
  }
  function refresh_values() {
      getGasPrice();
      fetchContractData()
      .then(function(a,b){
        //console.log("in then",claimedPrepaidUnits, claimedUnits)
        refresh_chart(claimedPrepaidUnits, claimedUnits);
      });
  }

  function blink() {
    $("#claim_button").fadeOut(500);
    $("#claim_button").fadeIn(500);
  }

  function refresh_chart(claimedPrepaidUnits, claimedUnits) {
    this.tokenBought = claimedUnits + claimedPrepaidUnits;
    this.tokenLeft = promissoryUnits - this.tokenBought;
    updateChart(this.tokenLeft,this.tokenBought);
    updateTexts(this.tokenLeft,this.tokenBought,claimedPrepaidUnits);

    if (tokensLeft === 0) {
      //$("#tokensLeft").html("Pre-Sale Over");
      disable_button();
      $("#claim_button").text("Pre-Sale Over");
      if(isblinking)clearInterval(isblinking);
      isblinking = setInterval(blink, 1000);
      blink();
    }
  }

  function updateTexts(tokensLeft,tokensBought,prepaid){
    thisRound = promissoryUnits - prepaid,
    discPrice = (prices.tkn_prc*prices.usd_btc*prices.btc_eth).toLocaleString([],{style:'currency',currency:'USD',maximumFractionDigits:2});

    //Update Texts
    $('#prom_tkns').text(promissoryUnits);
    $('#ths_rnd').text(thisRound);
    $('#tkns_lft').text(tokensLeft);
    $('#tkns_bgh').text(tokensBought);
    $('#tkns_bgh').text(tokensBought);
    $('#tkns_bgh').text(tokensBought);
    $('#tkns_dsc_prc').text(prices.tkn_prc+'ETH [ '+discPrice+' ]');
  }

  var notify = {
    options:{
        'closeButton': true,
        'debug': false,
        'newestOnTop': true,
        'progressBar': true,
        'positionClass': 'toast-top-right',
        'preventDuplicates': false,
        'hideDuration': '1000',
        'timeOut': '5000',
        'extendedTimeOut' : '1000',
        'showEasing': 'swing',
        'hideEasing': 'linear',
        'showMethod': 'fadeIn',
        'hideMethod': 'fadeOut'
    },
    note: function(msg,type,title){
      var config = Object.assign({},this.options);
      toastr.options = Object.assign(config,{timeOut: 0,extendedTimeOut: 0});
      toastr[type]('<span style="font-size:1rem;font-weight:600;">'+msg+'</span>');
    },
    show: function(msg,type,title){
      toastr.options = Object.assign({"showDuration": "1000"},this.options);
      toastr[type]('<span style="font-size:1rem;font-weight:600;">'+msg+'</span>');
    }
  }
