const table = document.getElementById("calculation-table");

const formatterConstructor = new Intl.NumberFormat("en-IN", {
	style: "currency",
	currency: "INR",
	maximumFractionDigits: 0,
	minimumFractionDigits: 0,
});
const currencyFormatter = (num) => {
	return formatterConstructor.format(num);
};

class Salary {
	basic;
	hra;
	sp_all;
	gross_sal;
	taxable_sal;
	bonus;
	pf_employee_contribution;
	rent_paid;
	STANDARD_DEDUCTION = 50e3;
	CESS = 0.04;
	variable_cmp = 0;
	totalOtherAllowances;

	static new_tax_rate = [
		[0, 0],
		[3e5, 0.05],
		[6e5, 0.1],
		[9e5, 0.15],
		[12e5, 0.2],
		[15e5, 0.3],
		[Number.POSITIVE_INFINITY, 0],
	];

	constructor(
		basic,
		hra,
		sp_all,
		inv,
		bonus,
		rentPaid,
		professionalTax,
		totalOtherAllowances
	) {
		this.basic = basic;
		this.hra = hra;
		this.sp_all = sp_all;
		this.variable_cmp = bonus;
		this.fixed_cmp = basic + hra + sp_all + totalOtherAllowances;
		this.gross_sal = this.fixed_cmp + bonus;
		this.rent_paid = rentPaid * 12;
		this.hra_empt = Math.round(
			Math.min(
				this.hra,
				this.basic * 0.4,
				Math.max(this.rent_paid - 0.1 * this.basic, 0)
			)
		);
		this.pf_employee_contribution = Math.round(0.12 * this.basic);
		this.professionalTax = professionalTax;
		this.taxable_sal =
			this.gross_sal -
			this.STANDARD_DEDUCTION -
			this.hra_empt -
			Math.min(inv.inv_80c+this.pf_employee_contribution, 150e3) -
			inv.inv_80e -
			inv.inv_80d;
	}
	getNewTax() {
		const newTaxComputations = {};
		const income = this.gross_sal;
		const taxable_income = income - this.STANDARD_DEDUCTION;
		if (taxable_income <= 7e5) return 0;
		let newTax = 0;
		for (let i = 0; i < Salary.new_tax_rate.length - 1; i++) {
			const [lower_limit, rate] = Salary.new_tax_rate[i];
			if (lower_limit > taxable_income) break;
			const upperLimit = Math.min(
				taxable_income,
				Salary.new_tax_rate[i + 1][0]
			);
			newTax = newTax + (upperLimit - lower_limit) * rate;
		}
		newTaxComputations["annualIncome"] = this.gross_sal;
		newTaxComputations["taxableIncome"] = taxable_income;
		newTaxComputations["taxOnSalary"] = Math.round(newTax);
		newTaxComputations["cess"] = Math.round(newTax * this.CESS);
		newTaxComputations["totalTax"] =
			newTaxComputations["taxOnSalary"] + newTaxComputations["cess"];
		newTaxComputations["pf employee contribution"] =
			this.pf_employee_contribution;
		newTaxComputations["totalDeductions"] =
			newTaxComputations["totalTax"] +
			this.pf_employee_contribution +
			this.professionalTax;
		newTaxComputations["professionalTax"] = this.professionalTax;
		const annualInHand = this.gross_sal - newTaxComputations["totalDeductions"];
		newTaxComputations["monthly in-hand"] = Math.round(
		(annualInHand - this.variable_cmp) / 12
		);
		newTaxComputations["annual in-hand"] = annualInHand;
		newTaxComputations["annual bonus"] = this.variable_cmp;
		newTaxComputations["annual in-hand + bonus"] = newTaxComputations["annual in-hand"]+newTaxComputations["annual bonus"];
		console.log(`new tax: `, newTaxComputations);
		//return newTax;
		return newTaxComputations;
	}

	getOldTax() {
		let total_tax = 0;
		//if (this.taxable_sal <= 500e3) return total_tax;
		if (this.taxable_sal > 500e3 && this.taxable_sal <= 1000e3) {
			total_tax = 12.5e3 + (this.taxable_sal - 500e3) * 0.2;
		}
		if (this.taxable_sal > 1000e3) {
			total_tax = 12.5e3 + 500e3 * 0.2 + (this.taxable_sal - 1000e3) * 0.3;
		}

		const taxComputations = {};
		taxComputations["annualIncome"] = this.gross_sal;
		taxComputations["taxableIncome"] = this.taxable_sal;
		taxComputations["taxOnSalary"] = Math.round(total_tax);
		taxComputations["cess"] = Math.round(total_tax * this.CESS);
		taxComputations["totalTax"] =
			taxComputations["taxOnSalary"] + taxComputations["cess"];
		taxComputations["pf employee contribution"] = this.pf_employee_contribution;
		taxComputations["totalDeductions"] =
			taxComputations["totalTax"] +
			this.pf_employee_contribution +
			this.professionalTax;
		taxComputations["professionalTax"] = this.professionalTax;
		const annualInHand = this.gross_sal - taxComputations["totalDeductions"];
		taxComputations["monthly in-hand"] = Math.round(
			(annualInHand - this.variable_cmp) / 12
		);
		taxComputations["annual in-hand"] = annualInHand;
		taxComputations["annual bonus"] = this.variable_cmp;
		taxComputations["annual in-hand + bonus"] = taxComputations["annual in-hand"]+taxComputations["annual bonus"];
		console.log(`old tax:`, taxComputations);
		//return total_tax * (1 + this.CESS);
		return taxComputations;
	}
}

function formSubmitHandler(e) {
	e.preventDefault();
	clearTableData();
	const formData = new FormData(e.currentTarget);
	const {
		basic,
		hra,
		sp_all,
		bonus,
		inv_80c,
		inv_80e,
		inv_80d,
		rentPaid,
		professionalTax,
		totalOtherAllowances
	} = Object.fromEntries(
		formData.entries().map(([key, value]) => {
			return [key, value - 0];
		})
	);
	console.log(e.currentTarget);
	console.log(
		basic,
		hra,
		sp_all,
		bonus,
		inv_80c,
		inv_80e,
		inv_80d,
		rentPaid,
		professionalTax,
		totalOtherAllowances
	);
	const newSal3 = new Salary(
		basic,
		hra,
		sp_all,
		{ inv_80c, inv_80e, inv_80d },
		bonus,
		rentPaid,
		professionalTax,
		totalOtherAllowances
	);
	updateTable("Old Tax Scheme", newSal3.getOldTax());
	updateTable("New Tax Scheme", newSal3.getNewTax());
	return false;
}

function updateTable(rowLabel, parameters) {
	const row = table.insertRow(table.rows.length);
	const rowLabelCell = row.insertCell(0);
	rowLabelCell.innerText = rowLabel;
	let i = 1;
	for (const value of Object.values(parameters)) {
		row.insertCell(i++).innerText = currencyFormatter(value);
	}
}
function clearTableData(){
	//clear previous data from table
	while(table.rows.length>1) {
		table.deleteRow(1);
	}
}