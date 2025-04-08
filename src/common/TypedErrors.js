class BusinessError extends Error {
	constructor(message,detail){
        super(message);
        this.name = "BusinessError"
        if (detail)
          this.moreDetail = detail
    }
}

exports.errors=  {
  
  
  BusinessError: BusinessError
}